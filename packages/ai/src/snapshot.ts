import type { ChannelKind, DeletionKind } from "./plan";

/**
 * One thing that already exists on the server, with the short ref the model uses to point at it.
 * `id` never reaches the model; the server maps a ref back to it.
 */
export interface ExistingItem {
  /** `r<n>` for a role, `k<n>` for a category, `h<n>` for a channel. */
  ref: string;
  kind: DeletionKind;
  id: string;
  name: string;
  /** The category a channel sits in, so the model can tell two "general" channels apart. */
  parentName: string | null;
  /** Never offered for deletion: built-in or managed roles, and channels Discord itself relies on. */
  isProtected: boolean;
}

/**
 * What the AI and the differ may know about the existing server: names and structure only. Never
 * message content, member names, or topics, so nothing a member wrote leaves Discord.
 */
export interface ServerSnapshot {
  roles: string[];
  /** Channels outside any category are listed under a category named `null`. */
  categories: { name: string | null; channels: { name: string; kind: ChannelKind | "other" }[] }[];
  /** The same things with refs and IDs. Absent in tests and callers that never delete. */
  items?: ExistingItem[];
}
