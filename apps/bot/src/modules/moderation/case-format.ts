import type { ModCaseType } from "@forgely/db";

import { formatDuration, MS_PER_SECOND } from "./duration";
import type { DmStatus, ModCase } from "./moderation.types";

const CASE_LABELS: Record<ModCaseType, string> = {
  ban: "Ban",
  kick: "Kick",
  timeout: "Timeout",
  warn: "Warning",
  purge: "Purge",
};

const PAST_TENSE: Record<ModCaseType, string> = {
  ban: "banned",
  kick: "kicked",
  timeout: "timed out",
  warn: "warned",
  purge: "purged",
};

/** The message posted to the mod-log channel. Mentions render but never ping. */
export function formatCaseLog(moderationCase: ModCase): string {
  const lines = [`**Case #${moderationCase.caseNumber} · ${CASE_LABELS[moderationCase.type]}**`];
  if (moderationCase.targetId) lines.push(`User: <@${moderationCase.targetId}>`);
  lines.push(`Moderator: <@${moderationCase.moderatorId}>`);
  if (moderationCase.durationSeconds) {
    lines.push(`Duration: ${formatDuration(moderationCase.durationSeconds * MS_PER_SECOND)}`);
  }
  lines.push(`Reason: ${moderationCase.reason}`);
  return lines.join("\n");
}

/** The part of a case the member is told about. Available before the case is stored. */
export type NoticeDetails = Pick<ModCase, "type" | "reason" | "durationSeconds">;

/** The direct message sent to the affected member. */
export function formatDmNotice(details: NoticeDetails, guildName: string): string {
  const action = PAST_TENSE[details.type];
  const duration = details.durationSeconds
    ? ` for ${formatDuration(details.durationSeconds * MS_PER_SECOND)}`
    : "";
  return `You were ${action}${duration} in **${guildName}**.\nReason: ${details.reason}`;
}

/** The ephemeral confirmation shown to the moderator who ran the command. */
export function formatActionReply(moderationCase: ModCase, dmStatus: DmStatus): string {
  const summary = `${CASE_LABELS[moderationCase.type]} recorded for <@${moderationCase.targetId}>. Case #${moderationCase.caseNumber}.`;
  return dmStatus === "failed" ? `${summary} They could not be reached by DM.` : summary;
}

export function formatWarningList(targetId: string, warnings: ModCase[]): string {
  if (warnings.length === 0) return `<@${targetId}> has no warnings.`;

  const lines = warnings.map((warning) => {
    const unixSeconds = Math.floor(warning.createdAt.getTime() / MS_PER_SECOND);
    return `**#${warning.caseNumber}** · <t:${unixSeconds}:d> · <@${warning.moderatorId}> · ${warning.reason}`;
  });
  return [`Warnings for <@${targetId}> (latest first):`, ...lines].join("\n");
}
