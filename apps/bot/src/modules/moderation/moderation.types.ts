import type { ModCaseRow } from "@forgely/db";
import type { ModerationConfig } from "@forgely/shared";

import type { Logger } from "../../core/logger";

export type ModCase = ModCaseRow;

/** A person taking part in a moderation action, reduced to what permission checks need. */
export interface ModerationParty {
  id: string;
  isOwner: boolean;
  /** Position of the member's highest role. Higher means more powerful. */
  highestRolePosition: number;
}

/** What the service can do in Discord. The adapter implements it; tests fake it. */
export interface ModerationApi {
  guildName: string;
  /** Returns null when the user is not (or no longer) a member of the guild. */
  getMember: (userId: string) => Promise<ModerationParty | null>;
  ban: (userId: string, reason: string, deleteMessageSeconds: number) => Promise<void>;
  kick: (userId: string, reason: string) => Promise<void>;
  timeout: (userId: string, durationMs: number, reason: string) => Promise<void>;
  /** Returns false when the user has DMs closed or cannot be reached. */
  sendDm: (userId: string, content: string) => Promise<boolean>;
  postToChannel: (channelId: string, content: string) => Promise<void>;
  /** Deletes recent messages and returns how many were removed. */
  purge: (channelId: string, amount: number, onlyFromUserId?: string) => Promise<number>;
}

/** Everything one moderation action needs, resolved once per command. */
export interface ModerationContext {
  api: ModerationApi;
  config: ModerationConfig;
  guildId: string;
  actor: ModerationParty;
  bot: ModerationParty;
  logger: Logger;
}

/** Whether the affected member was told about the action. */
export type DmStatus = "sent" | "failed" | "disabled";

export interface ModerationResult {
  moderationCase: ModCase;
  dmStatus: DmStatus;
}
