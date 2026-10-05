import {
  LEVELING_MODULE_ID,
  MODERATION_MODULE_ID,
  ROLE_PANELS_MODULE_ID,
  TICKETS_MODULE_ID,
  WELCOME_MODULE_ID,
} from "@forgely/shared";

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
}

/** The modules that exist today, in the order the dashboard lists them. */
export const MODULE_CATALOG: ModuleInfo[] = [
  {
    id: MODERATION_MODULE_ID,
    name: "Moderation",
    description: "/ban, /kick, /timeout, /warn, /warnings, and /purge, with a stored case history.",
  },
  {
    id: WELCOME_MODULE_ID,
    name: "Welcome",
    description: "Welcome and goodbye messages, an optional welcome DM, and auto-roles.",
  },
  {
    id: LEVELING_MODULE_ID,
    name: "Leveling",
    description: "XP for chatting, level-up messages, role rewards, /rank, and /leaderboard.",
  },
  {
    id: ROLE_PANELS_MODULE_ID,
    name: "Role panels",
    description: "Messages with buttons that give or take a role, with a live preview.",
  },
  {
    id: TICKETS_MODULE_ID,
    name: "Tickets",
    description:
      "A button that opens a private channel with your support team, with an optional log.",
  },
];
