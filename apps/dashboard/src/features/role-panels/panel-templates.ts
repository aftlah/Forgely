import type { RolePanel } from "@forgely/shared";

export interface PanelTemplate {
  label: string;
  title: string;
  description: string;
  mode: RolePanel["mode"];
}

/**
 * Starting texts for a new panel. They fill the wording and the behavior only: which roles to hand
 * out is specific to each server, so the person always picks those themselves.
 */
export const PANEL_TEMPLATES: PanelTemplate[] = [
  {
    label: "Colors",
    title: "Pick your color",
    description: "Choose one color role. Picking another one replaces it.",
    mode: "unique",
  },
  {
    label: "Pronouns",
    title: "Pick your pronouns",
    description: "Press the buttons for the pronouns you use. Press again to remove one.",
    mode: "toggle",
  },
  {
    label: "Region",
    title: "Where are you from?",
    description: "Choose your region so others know when you are around.",
    mode: "unique",
  },
  {
    label: "Game pings",
    title: "Game pings",
    description: "Choose which games you want to be pinged for.",
    mode: "toggle",
  },
  {
    label: "Notifications",
    title: "Notifications",
    description: "Choose what you want to be notified about. Press again to stop.",
    mode: "toggle",
  },
];
