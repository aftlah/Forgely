import { z } from "zod";

import { defineModuleConfig } from "../module-config";
import { snowflakeSchema } from "../snowflake";

export const ROLE_PANELS_MODULE_ID = "role-panels";

/** Discord allows 5 rows of 5 buttons in one message. */
export const MAX_BUTTONS_PER_PANEL = 25;
export const MAX_PANELS = 10;
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LABEL_LENGTH = 80;

export const PANEL_BUTTON_STYLES = ["primary", "secondary", "success", "danger"] as const;
/** `toggle`: each button adds or removes its own role. `unique`: picking one role swaps out the others. */
export const PANEL_MODES = ["toggle", "unique"] as const;

/** Panel IDs are short and made in the browser, so they must be easy to validate. */
export const panelIdSchema = z.string().regex(/^[a-z0-9]{8}$/, "Invalid panel id.");

const panelButtonSchema = z.object({
  roleId: snowflakeSchema,
  label: z
    .string()
    .min(1, "Give the button a label.")
    .max(MAX_LABEL_LENGTH, `Keep the label under ${MAX_LABEL_LENGTH} characters.`),
  style: z.enum(PANEL_BUTTON_STYLES),
});

const panelSchema = z
  .object({
    id: panelIdSchema,
    title: z
      .string()
      .min(1, "Give the panel a title.")
      .max(MAX_TITLE_LENGTH, `Keep the title under ${MAX_TITLE_LENGTH} characters.`),
    description: z.string().max(MAX_DESCRIPTION_LENGTH, "That description is too long."),
    /** Where the panel should be posted. Null until the owner picks a channel. */
    channelId: snowflakeSchema.nullable(),
    /** The message currently posted for this panel, if any. Written by the dashboard when it posts. */
    message: z.object({ channelId: snowflakeSchema, messageId: snowflakeSchema }).nullable(),
    mode: z.enum(PANEL_MODES),
    buttons: z.array(panelButtonSchema).max(MAX_BUTTONS_PER_PANEL),
  })
  .superRefine((panel, context) => {
    const roleIds = panel.buttons.map((button) => button.roleId);
    if (new Set(roleIds).size !== roleIds.length) {
      context.addIssue({
        code: "custom",
        path: ["buttons"],
        message: "Each role can appear only once in a panel.",
      });
    }
  });

export type RolePanel = z.infer<typeof panelSchema>;
export type RolePanelButton = RolePanel["buttons"][number];

export const rolePanelsConfigSchema = z
  .object({ panels: z.array(panelSchema).max(MAX_PANELS) })
  .superRefine((config, context) => {
    const ids = config.panels.map((panel) => panel.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["panels"],
        message: "Two panels share the same id.",
      });
    }
  });

export type RolePanelsConfig = z.infer<typeof rolePanelsConfigSchema>;

export const rolePanelsModuleConfig = defineModuleConfig({
  moduleId: ROLE_PANELS_MODULE_ID,
  version: 1,
  schema: rolePanelsConfigSchema,
  defaults: { panels: [] },
});

/** First part of every role-panel button's custom ID. The bot routes button clicks by this prefix. */
export const ROLE_PANEL_BUTTON_PREFIX = "rp";

/** The custom ID of one button: `rp:<panelId>:<roleId>`. Well under Discord's 100-character limit. */
export function buildRolePanelButtonId(panelId: string, roleId: string): string {
  return `${ROLE_PANEL_BUTTON_PREFIX}:${panelId}:${roleId}`;
}

/** Reads the parts after the prefix back into IDs, or null if they are not a valid pair. */
export function parseRolePanelButtonParts(
  parts: string[],
): { panelId: string; roleId: string } | null {
  const [panelId, roleId, ...extra] = parts;
  if (extra.length > 0) return null;
  const parsed = z
    .object({ panelId: panelIdSchema, roleId: snowflakeSchema })
    .safeParse({ panelId, roleId });
  return parsed.success ? parsed.data : null;
}
