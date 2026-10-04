import type { ModCaseType } from "@forgely/db";
import { NotFoundError, PermissionError, ValidationError } from "@forgely/shared";

import { formatCaseLog, formatDmNotice, type NoticeDetails } from "./case-format";
import { MS_PER_SECOND, SECONDS_PER_DAY } from "./duration";
import { BLOCKER_MESSAGES, getModerationBlocker } from "./hierarchy";
import type { ModerationRepository } from "./moderation.repository";
import type { DmStatus, ModCase, ModerationContext, ModerationResult } from "./moderation.types";

export const DEFAULT_REASON = "No reason provided";
export const MAX_PURGE_AMOUNT = 100;
const WARNINGS_PAGE_SIZE = 10;

interface MemberActionInput {
  context: ModerationContext;
  targetId: string;
  reason?: string;
}

interface PurgeInput {
  context: ModerationContext;
  channelId: string;
  amount: number;
  onlyFromUserId?: string;
}

export interface PurgeResult {
  deletedCount: number;
  /** Undefined when nothing was deleted, so there is nothing to record. */
  moderationCase: ModCase | undefined;
}

export interface ModerationService {
  ban: (input: MemberActionInput & { deleteMessageDays: number }) => Promise<ModerationResult>;
  kick: (input: MemberActionInput) => Promise<ModerationResult>;
  timeout: (input: MemberActionInput & { durationMs: number }) => Promise<ModerationResult>;
  warn: (input: MemberActionInput) => Promise<ModerationResult>;
  purge: (input: PurgeInput) => Promise<PurgeResult>;
  listWarnings: (guildId: string, targetId: string) => Promise<ModCase[]>;
}

/** Describes one action so a single code path can validate, execute, record, and report it. */
interface MemberActionPlan {
  input: MemberActionInput;
  type: ModCaseType;
  durationMs?: number;
  /** Bans may target people who already left; every other action needs a current member. */
  requiresMember: boolean;
  /** True for actions that remove the member from the server: the DM must arrive first. */
  notifyBeforeAction: boolean;
  perform: (auditReason: string) => Promise<void>;
}

function planBan(input: MemberActionInput & { deleteMessageDays: number }): MemberActionPlan {
  const { api } = input.context;
  return {
    input,
    type: "ban",
    requiresMember: false,
    notifyBeforeAction: true,
    perform: (auditReason) =>
      api.ban(input.targetId, auditReason, input.deleteMessageDays * SECONDS_PER_DAY),
  };
}

function planKick(input: MemberActionInput): MemberActionPlan {
  return {
    input,
    type: "kick",
    requiresMember: true,
    notifyBeforeAction: true,
    perform: (auditReason) => input.context.api.kick(input.targetId, auditReason),
  };
}

function planTimeout(input: MemberActionInput & { durationMs: number }): MemberActionPlan {
  return {
    input,
    type: "timeout",
    durationMs: input.durationMs,
    requiresMember: true,
    notifyBeforeAction: false,
    perform: (auditReason) =>
      input.context.api.timeout(input.targetId, input.durationMs, auditReason),
  };
}

function planWarn(input: MemberActionInput): MemberActionPlan {
  return {
    input,
    type: "warn",
    requiresMember: true,
    notifyBeforeAction: false,
    perform: async () => undefined,
  };
}

/** Discord shows this in the server's audit log, so it records who really did it. */
function buildAuditReason(moderatorId: string, reason: string): string {
  return `[${moderatorId}] ${reason}`;
}

async function assertTargetAllowed(
  { context, targetId }: MemberActionInput,
  requiresMember: boolean,
): Promise<void> {
  const { api, actor, bot } = context;
  const target = await api.getMember(targetId);
  if (!target && requiresMember) {
    throw new NotFoundError(`User ${targetId} is not a member`, "That user isn't in this server.");
  }

  const blocker = getModerationBlocker({ actor, bot, targetId, target });
  if (blocker) throw new PermissionError(`Blocked: ${blocker}`, BLOCKER_MESSAGES[blocker]);
}

async function notifyTarget(
  context: ModerationContext,
  targetId: string,
  details: NoticeDetails,
): Promise<DmStatus> {
  if (!context.config.notifyUserByDm) return "disabled";
  const delivered = await context.api.sendDm(
    targetId,
    formatDmNotice(details, context.api.guildName),
  );
  return delivered ? "sent" : "failed";
}

/** The case is already saved, so a broken mod-log channel is logged but never fails the command. */
async function postToModLog(context: ModerationContext, moderationCase: ModCase): Promise<void> {
  const { modLogChannelId } = context.config;
  if (!modLogChannelId) return;

  try {
    await context.api.postToChannel(modLogChannelId, formatCaseLog(moderationCase));
  } catch (error) {
    context.logger.warn({ err: error, modLogChannelId }, "Could not post to the mod-log channel");
  }
}

async function purgeMessages(
  repository: ModerationRepository,
  { context, channelId, amount, onlyFromUserId }: PurgeInput,
): Promise<PurgeResult> {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_PURGE_AMOUNT) {
    throw new ValidationError(
      `Purge amount out of range: ${amount}`,
      `Choose a number between 1 and ${MAX_PURGE_AMOUNT}.`,
    );
  }

  const deletedCount = await context.api.purge(channelId, amount, onlyFromUserId);
  if (deletedCount === 0) return { deletedCount, moderationCase: undefined };

  const fromUser = onlyFromUserId ? ` from <@${onlyFromUserId}>` : "";
  const moderationCase = await repository.createCase({
    guildId: context.guildId,
    type: "purge",
    targetId: onlyFromUserId ?? null,
    moderatorId: context.actor.id,
    reason: `Purged ${deletedCount} message(s)${fromUser} in <#${channelId}>`,
    durationSeconds: null,
  });
  await postToModLog(context, moderationCase);
  return { deletedCount, moderationCase };
}

export function createModerationService(deps: {
  repository: ModerationRepository;
}): ModerationService {
  const { repository } = deps;

  /**
   * Check the target, act, record the case, tell the member, post to the mod log.
   * A failed action throws before anything is recorded.
   */
  async function moderateMember(plan: MemberActionPlan): Promise<ModerationResult> {
    const { input, type, durationMs, requiresMember, notifyBeforeAction, perform } = plan;
    const { context, targetId } = input;
    const reason = input.reason ?? DEFAULT_REASON;
    const durationSeconds = durationMs ? Math.round(durationMs / MS_PER_SECOND) : null;
    const details: NoticeDetails = { type, reason, durationSeconds };

    await assertTargetAllowed(input, requiresMember);

    let dmStatus: DmStatus = "disabled";
    if (notifyBeforeAction) dmStatus = await notifyTarget(context, targetId, details);
    await perform(buildAuditReason(context.actor.id, reason));
    const moderationCase = await repository.createCase({
      guildId: context.guildId,
      targetId,
      moderatorId: context.actor.id,
      ...details,
    });
    if (!notifyBeforeAction) dmStatus = await notifyTarget(context, targetId, details);

    await postToModLog(context, moderationCase);
    return { moderationCase, dmStatus };
  }

  return {
    ban: (input) => moderateMember(planBan(input)),
    kick: (input) => moderateMember(planKick(input)),
    timeout: (input) => moderateMember(planTimeout(input)),
    warn: (input) => moderateMember(planWarn(input)),
    purge: (input) => purgeMessages(repository, input),
    listWarnings: (guildId, targetId) =>
      repository.listCasesForTarget(guildId, targetId, "warn", WARNINGS_PAGE_SIZE),
  };
}
