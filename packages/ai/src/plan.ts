import { z } from "zod";

import { snowflakeSchema } from "@forgely/shared";

/**
 * The AI builder's output. It is deliberately narrow: the model can only name roles, categories and
 * channels, and say who may see them. It cannot express a permission bit or a rename. The one
 * destructive thing it can ask for is a deletion, and only by pointing at an item that already exists
 * (a short ref the server hands out, never a name or an ID it makes up). A deletion is a proposal:
 * nothing is deleted unless the person ticks that item and confirms. Everything the plan creates is
 * cosmetic or access-restricting, never access-granting beyond a role the same plan creates.
 */
export const PLAN_LIMITS = {
  maxRoles: 25,
  maxCategories: 12,
  maxChannelsPerCategory: 15,
  maxChannels: 60,
  maxNameLength: 100,
  maxTopicLength: 1024,
  maxSummaryLength: 300,
  maxDeletions: 40,
} as const;

export const CHANNEL_KINDS = ["text", "announcement", "voice", "forum"] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

/**
 * `public`: everyone can read and talk. `read-only`: everyone can read, nobody but staff can talk.
 * `private`: only the listed roles can see it.
 */
export const CHANNEL_ACCESS = ["public", "read-only", "private"] as const;
export type ChannelAccess = (typeof CHANNEL_ACCESS)[number];

/** A role is referred to by `key` inside the plan, so a channel can name a role that does not exist yet. */
const roleKeySchema = z
  .string()
  .regex(/^[a-z0-9-]{1,32}$/, "A role key is 1-32 lowercase letters, digits, or dashes.");

const nameSchema = z.string().min(1).max(PLAN_LIMITS.maxNameLength);

const roleSchema = z.object({
  key: roleKeySchema,
  name: nameSchema,
  /** Hex like `#3498db`. Omitted means Discord's default grey. */
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  /** Show members of this role separately in the member list. */
  isHoisted: z.boolean(),
});

const channelSchema = z.object({
  name: nameSchema,
  kind: z.enum(CHANNEL_KINDS),
  topic: z.string().max(PLAN_LIMITS.maxTopicLength).nullable(),
  access: z.enum(CHANNEL_ACCESS),
  /** Only used with `private`: the keys of roles that can see the channel. */
  allowedRoleKeys: z.array(roleKeySchema).max(PLAN_LIMITS.maxRoles),
});

const categorySchema = z.object({
  name: nameSchema,
  channels: z.array(channelSchema).min(1).max(PLAN_LIMITS.maxChannelsPerCategory),
});

/** What the model may point at: `r1` is a role, `k1` a category, `h1` a channel, as listed in its prompt. */
export const DELETE_REF_PATTERN = /^[rkh]\d{1,4}$/;

export const DELETION_KINDS = ["role", "category", "channel"] as const;
export type DeletionKind = (typeof DELETION_KINDS)[number];

/** An existing item the plan proposes to delete, resolved by the server from a ref. */
const deletionSchema = z.object({
  kind: z.enum(DELETION_KINDS),
  id: snowflakeSchema,
  /** The name when the plan was made. Apply refuses if the item was renamed since. */
  name: z.string().max(PLAN_LIMITS.maxNameLength),
});

const planBody = {
  summary: z.string().min(1).max(PLAN_LIMITS.maxSummaryLength),
  roles: z.array(roleSchema).max(PLAN_LIMITS.maxRoles),
  // May be empty: a plan that only removes things creates no categories.
  categories: z.array(categorySchema).max(PLAN_LIMITS.maxCategories),
};

type PlanBody = z.infer<z.ZodObject<typeof planBody>>;

function checkPlan(plan: PlanBody, hasDeletions: boolean, context: z.RefinementCtx): void {
  const keys = plan.roles.map((role) => role.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: "custom", path: ["roles"], message: "Two roles share a key." });
  }
  const known = new Set(keys);
  plan.categories.forEach((category, categoryIndex) => {
    category.channels.forEach((channel, channelIndex) => {
      const unknownKey = channel.allowedRoleKeys.find((key) => !known.has(key));
      const isMisused = channel.access !== "private" && channel.allowedRoleKeys.length > 0;
      if (
        unknownKey ||
        isMisused ||
        (channel.access === "private" && channel.allowedRoleKeys.length === 0)
      ) {
        context.addIssue({
          code: "custom",
          path: ["categories", categoryIndex, "channels", channelIndex, "allowedRoleKeys"],
          message: "A private channel needs known roles; other channels must list none.",
        });
      }
    });
  });
  const total = plan.categories.reduce((sum, category) => sum + category.channels.length, 0);
  if (total > PLAN_LIMITS.maxChannels) {
    context.addIssue({ code: "custom", path: ["categories"], message: "Too many channels." });
  }
  if (plan.roles.length + plan.categories.length === 0 && !hasDeletions) {
    context.addIssue({ code: "custom", path: ["categories"], message: "The plan does nothing." });
  }
}

/** What the model returns: creations, plus refs to existing items it proposes to delete. */
export const modelPlanSchema = z
  .object({
    ...planBody,
    deleteRefs: z
      .array(z.string().regex(DELETE_REF_PATTERN))
      .max(PLAN_LIMITS.maxDeletions)
      .default([]),
  })
  .superRefine((plan, context) => checkPlan(plan, plan.deleteRefs.length > 0, context));

/** The plan as stored and shown: refs already resolved by the server into real items. */
export const serverPlanSchema = z
  .object({
    ...planBody,
    deletions: z.array(deletionSchema).max(PLAN_LIMITS.maxDeletions).default([]),
  })
  .superRefine((plan, context) => checkPlan(plan, plan.deletions.length > 0, context));

export type ServerPlan = z.infer<typeof serverPlanSchema>;
export type PlanRole = ServerPlan["roles"][number];
export type PlanCategory = ServerPlan["categories"][number];
export type PlanChannel = PlanCategory["channels"][number];
export type PlanDeletion = ServerPlan["deletions"][number];
export type ModelPlan = z.infer<typeof modelPlanSchema>;
