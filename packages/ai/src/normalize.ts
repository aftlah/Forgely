import { PLAN_LIMITS, type ChannelKind, type PlanChannel, type ServerPlan } from "./plan";

// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
/** Mentions and Discord markup have no place in a name: `@everyone`, `<@123>`, `<#123>`. */
const MARKUP = /<[^>]*>|[@`*~|]/g;
const NAME_FALLBACK = {
  role: "new-role",
  category: "New category",
  channel: "new-channel",
} as const;
/** Words that would read as a ping or clash with Discord's built-in role. */
const RESERVED_ROLE_NAMES = new Set(["everyone", "here"]);
const SLUG_KINDS: ReadonlySet<ChannelKind> = new Set(["text", "announcement", "forum"]);

/**
 * Removes control characters, mentions, and markup, collapses whitespace, and caps the length. Names
 * are capped at the name limit; pass a larger cap for longer text such as the plan's summary.
 */
export function cleanName(raw: string, maxLength: number = PLAN_LIMITS.maxNameLength): string {
  return raw
    .replace(CONTROL_CHARACTERS, " ")
    .replace(MARKUP, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Discord shows text-like channel names lowercase with dashes, so the plan states them that way. */
export function toChannelSlug(raw: string): string {
  return cleanName(raw)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRoleName(raw: string): string {
  const name = cleanName(raw) || NAME_FALLBACK.role;
  return RESERVED_ROLE_NAMES.has(name.toLowerCase()) ? `${name} members` : name;
}

function normalizeChannel(channel: PlanChannel): PlanChannel {
  const isSlugged = SLUG_KINDS.has(channel.kind);
  const name = isSlugged ? toChannelSlug(channel.name) : cleanName(channel.name);
  return {
    ...channel,
    name: name || NAME_FALLBACK.channel,
    topic: channel.topic ? cleanName(channel.topic) || null : null,
  };
}

/**
 * Makes a validated plan safe to show and apply: clean names, Discord-style channel names, lowercase
 * colors. Run after validation, so the shape is already known to be right.
 */
export function normalizePlan(plan: ServerPlan): ServerPlan {
  return {
    summary: cleanName(plan.summary, PLAN_LIMITS.maxSummaryLength) || "Server plan",
    deletions: plan.deletions,
    roles: plan.roles.map((role) => ({
      ...role,
      name: normalizeRoleName(role.name),
      color: role.color ? role.color.toLowerCase() : null,
    })),
    categories: plan.categories.map((category) => ({
      name: cleanName(category.name) || NAME_FALLBACK.category,
      channels: category.channels.map(normalizeChannel),
    })),
  };
}
