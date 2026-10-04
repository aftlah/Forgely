import type { RoleOption } from "../guild-resources";

/** Why Forgely can't hand out a role, in the words shown next to it. */
export const UNAVAILABLE_TEXT: Record<NonNullable<RoleOption["unavailableReason"]>, string> = {
  managed: "managed by an integration",
  "above-bot": "above Forgely's role",
};
