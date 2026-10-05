import type { ChannelKind, CreationPlan, PlanChannel, PlanDeletion, PlanRole } from "@forgely/ai";

import { buildOverwrites } from "./permission-overwrites";
import { CHANNEL_TYPE, type ServerState } from "./server-state";

import type { DiscordGuildRest, NewChannel } from "@/lib/discord-guild-rest";
import { DiscordRestError } from "@/lib/discord-transport";

const HTTP_FORBIDDEN = 403;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HEX_RADIX = 16;

export type ItemKind = "role" | "category" | "channel";
export type ItemOutcome = "created" | "created-as-text" | "deleted" | "failed" | "skipped";

export interface ApplyItemResult {
  kind: ItemKind;
  name: string;
  outcome: ItemOutcome;
  /** Plain-language reason, for outcomes that need one. */
  message?: string;
}

export interface ApplyResult {
  items: ApplyItemResult[];
  createdCount: number;
  /** Items deleted because the person ticked them and confirmed. */
  deletedCount: number;
  failedCount: number;
}

export interface ApplyDeps {
  rest: DiscordGuildRest;
  guildId: string;
  botUserId: string;
  state: ServerState;
}

type CreationCategory = CreationPlan["categories"][number];
type ItemRef = Pick<ApplyItemResult, "kind" | "name">;

const TYPE_BY_KIND: Record<ChannelKind, number> = {
  text: CHANNEL_TYPE.text,
  voice: CHANNEL_TYPE.voice,
  announcement: CHANNEL_TYPE.announcement,
  forum: CHANNEL_TYPE.forum,
};
/** Announcement and forum channels only exist on Community servers; elsewhere a text channel is the closest thing. */
const COMMUNITY_ONLY: ReadonlySet<ChannelKind> = new Set(["announcement", "forum"]);

const MISSING_PERMISSION =
  "Forgely is missing a permission. Give it Manage Roles and Manage Channels, then try again.";

const byName = <T extends { name: string }>(items: T[], name: string): T | undefined =>
  items.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());

const toColorNumber = (hex: string | null): number =>
  hex ? Number.parseInt(hex.slice(1), HEX_RADIX) : 0;

function describeFailure(error: unknown): string {
  if (!(error instanceof DiscordRestError)) return "Something went wrong while creating it.";
  return error.status === HTTP_FORBIDDEN
    ? MISSING_PERMISSION
    : `Discord refused it (HTTP ${error.status}).`;
}

const DELETE_REFUSED =
  "Forgely is not allowed to delete this. It may sit above Forgely's role, or Forgely lacks Manage Channels or Manage Roles.";

function describeDeleteFailure(error: unknown): string {
  if (!(error instanceof DiscordRestError)) return "Something went wrong while deleting it.";
  return error.status === HTTP_FORBIDDEN
    ? DELETE_REFUSED
    : `Discord refused it (HTTP ${error.status}).`;
}

function summarize(items: ApplyItemResult[]): ApplyResult {
  const isCreated = (item: ApplyItemResult): boolean =>
    item.outcome === "created" || item.outcome === "created-as-text";
  const createdCount = items.filter(isCreated).length;
  const deletedCount = items.filter((item) => item.outcome === "deleted").length;
  return {
    items,
    createdCount,
    deletedCount,
    failedCount: items.length - createdCount - deletedCount,
  };
}

/**
 * Runs one plan against Discord. Creating comes first, then the deletions the person ticked and confirmed
 * (channels, then categories, then roles), so a failed creation never leaves the server with less than
 * before. Nothing existing is ever edited. One failure does not stop the rest, except a refused
 * permission while creating, which would fail every remaining creation the same way.
 */
class PlanApplier {
  private readonly items: ApplyItemResult[] = [];
  private readonly roleIds = new Map<string, string>();
  private isBlocked = false;

  constructor(private readonly deps: ApplyDeps) {}

  async run(creation: CreationPlan): Promise<ApplyResult> {
    for (const existing of creation.existingRoles) {
      const found = byName(this.deps.state.roles, existing.name);
      if (found) this.roleIds.set(existing.key, found.id);
    }
    for (const role of creation.newRoles) await this.createRole(role);
    for (const category of creation.categories) await this.createCategory(category);
    await this.deleteConfirmed(creation.deletions);
    return summarize(this.items);
  }

  private record(ref: ItemRef, outcome: ItemOutcome, message?: string): void {
    this.items.push({ ...ref, outcome, message });
  }

  /** Runs one Discord call; a failure is recorded and turned into `null` so the caller can move on. */
  private async attempt<T>(ref: ItemRef, call: () => Promise<T>): Promise<T | null> {
    if (this.isBlocked) {
      this.record(ref, "skipped", "Skipped because an earlier step was refused.");
      return null;
    }
    try {
      return await call();
    } catch (error) {
      if (error instanceof DiscordRestError && error.status === HTTP_FORBIDDEN)
        this.isBlocked = true;
      this.record(ref, "failed", describeFailure(error));
      return null;
    }
  }

  /** Channels first, then categories, then roles: a category is emptied of the channels being removed before it goes. */
  private async deleteConfirmed(deletions: PlanDeletion[]): Promise<void> {
    for (const kind of ["channel", "category", "role"] as const) {
      for (const deletion of deletions.filter((candidate) => candidate.kind === kind)) {
        await this.deleteOne(deletion);
      }
    }
  }

  private async deleteOne(deletion: PlanDeletion): Promise<void> {
    const ref: ItemRef = { kind: deletion.kind, name: deletion.name };
    try {
      if (deletion.kind === "role") await this.deps.rest.deleteRole(this.deps.guildId, deletion.id);
      else await this.deps.rest.deleteChannel(deletion.id);
      this.record(ref, "deleted");
    } catch (error) {
      const isGone = error instanceof DiscordRestError && error.status === HTTP_NOT_FOUND;
      if (isGone) this.record(ref, "skipped", "It was already gone.");
      else this.record(ref, "failed", describeDeleteFailure(error));
    }
  }

  private async createRole(role: PlanRole): Promise<void> {
    const ref: ItemRef = { kind: "role", name: role.name };
    const created = await this.attempt(ref, () =>
      this.deps.rest.createRole(this.deps.guildId, {
        name: role.name,
        color: toColorNumber(role.color),
        hoist: role.isHoisted,
      }),
    );
    if (!created) return;
    this.roleIds.set(role.key, created.id);
    this.record(ref, "created");
  }

  private async createCategory(category: CreationCategory): Promise<void> {
    const parentId = category.isNew
      ? await this.makeCategory(category.name)
      : this.findCategory(category.name);
    for (const channel of category.channels) {
      if (parentId === null) {
        this.record(
          { kind: "channel", name: channel.name },
          "skipped",
          "Its category was not created.",
        );
      } else {
        await this.createChannel(channel, parentId);
      }
    }
  }

  private findCategory(name: string): string | null {
    const categories = this.deps.state.channels.filter(
      (channel) => channel.type === CHANNEL_TYPE.category,
    );
    return byName(categories, name)?.id ?? null;
  }

  private async makeCategory(name: string): Promise<string | null> {
    const ref: ItemRef = { kind: "category", name };
    const created = await this.attempt(ref, () =>
      this.deps.rest.createChannel(this.deps.guildId, { name, type: CHANNEL_TYPE.category }),
    );
    if (created) this.record(ref, "created");
    return created?.id ?? null;
  }

  private async createChannel(channel: PlanChannel, parentId: string): Promise<void> {
    const ref: ItemRef = { kind: "channel", name: channel.name };
    if (channel.allowedRoleKeys.some((key) => !this.roleIds.has(key))) {
      this.record(ref, "skipped", "Not created: it is private and a role it needs does not exist.");
      return;
    }
    const payload: NewChannel = {
      name: channel.name,
      type: TYPE_BY_KIND[channel.kind],
      parent_id: parentId,
      topic: channel.topic ?? undefined,
      permission_overwrites: buildOverwrites(channel, {
        everyoneId: this.deps.guildId,
        botUserId: this.deps.botUserId,
        roleIds: this.roleIds,
      }),
    };
    const outcome = await this.attempt(ref, () => this.createWithFallback(channel.kind, payload));
    if (outcome) this.record(ref, outcome);
  }

  private async createWithFallback(kind: ChannelKind, payload: NewChannel): Promise<ItemOutcome> {
    try {
      await this.deps.rest.createChannel(this.deps.guildId, payload);
      return "created";
    } catch (error) {
      const isRefused = error instanceof DiscordRestError && error.status === HTTP_BAD_REQUEST;
      if (!isRefused || !COMMUNITY_ONLY.has(kind)) throw error;
      await this.deps.rest.createChannel(this.deps.guildId, {
        ...payload,
        type: CHANNEL_TYPE.text,
      });
      return "created-as-text";
    }
  }
}

export function applyCreationPlan(deps: ApplyDeps, creation: CreationPlan): Promise<ApplyResult> {
  return new PlanApplier(deps).run(creation);
}
