import { buildRolePanelButtonId, type RolePanel } from "@forgely/shared";

import type { DiscordMessagePayload } from "@/lib/discord-rest";

/** Discord's numeric codes for button styles. */
const BUTTON_STYLE_CODES = { primary: 1, secondary: 2, success: 3, danger: 4 } as const;
const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const BUTTONS_PER_ROW = 5;
/** Forgely's ember orange, as the embed's side stripe. */
const EMBED_COLOR = 0xff5a1f;

/**
 * The Discord message for a panel: an embed with the title and description, and its buttons laid out
 * five to a row. `allowed_mentions` is empty so nothing in a title or description can ping anyone.
 */
export function buildPanelMessage(panel: RolePanel): DiscordMessagePayload {
  const buttons = panel.buttons.map((button) => ({
    type: COMPONENT_TYPE_BUTTON,
    style: BUTTON_STYLE_CODES[button.style],
    label: button.label,
    custom_id: buildRolePanelButtonId(panel.id, button.roleId),
  }));

  const rows = [];
  for (let start = 0; start < buttons.length; start += BUTTONS_PER_ROW) {
    rows.push({
      type: COMPONENT_TYPE_ACTION_ROW,
      components: buttons.slice(start, start + BUTTONS_PER_ROW),
    });
  }

  return {
    embeds: [
      {
        title: panel.title,
        ...(panel.description ? { description: panel.description } : {}),
        color: EMBED_COLOR,
      },
    ],
    components: rows,
    allowed_mentions: { parse: [] },
  };
}
