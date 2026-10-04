# welcome module

Welcome and goodbye messages, an optional welcome DM, and auto-roles.

- Config: `welcomeModuleConfig` in `@forgely/shared` (version 1). Disabled until switched on per guild.
- Placeholders: `{user}` (mention), `{username}`, `{server}`, `{memberCount}`. On goodbye, `{user}`
  is the plain username because a member who left can no longer be mentioned.
- Requires the **Server Members** privileged intent.
- `welcome.service.ts` holds the logic and talks to Discord only through `WelcomeActions`;
  `discord-welcome-adapter.ts` is the thin discord.js implementation.
- Each step (auto-role, message, DM) fails independently and is logged, never thrown.
- Bots only receive auto-roles; they get no welcome or goodbye message.
- Messages can ping only the joining member, never `@everyone`, `@here`, or roles.
