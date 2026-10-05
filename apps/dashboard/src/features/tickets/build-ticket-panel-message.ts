import { buildTicketButtonId, TICKET_OPEN_ACTION, type TicketsConfig } from "@forgely/shared";

import type { DiscordMessagePayload } from "@/lib/discord-rest";

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
/** Discord's "primary" button style (blue). */
const BUTTON_STYLE_PRIMARY = 1;
/** Forgely's ember orange, as the embed's side stripe. */
const EMBED_COLOR = 0xff5a1f;

/**
 * The message people press to open a ticket: an embed and one button. `allowed_mentions` is empty so
 * nothing in the title or description can ping anyone.
 */
export function buildTicketPanelMessage(panel: TicketsConfig["panel"]): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: panel.title,
        ...(panel.description ? { description: panel.description } : {}),
        color: EMBED_COLOR,
      },
    ],
    components: [
      {
        type: COMPONENT_TYPE_ACTION_ROW,
        components: [
          {
            type: COMPONENT_TYPE_BUTTON,
            style: BUTTON_STYLE_PRIMARY,
            label: panel.buttonLabel,
            custom_id: buildTicketButtonId(TICKET_OPEN_ACTION),
          },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}
