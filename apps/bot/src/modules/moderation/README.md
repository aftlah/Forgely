# moderation module

`/ban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/purge`. Every action is stored as a case
(`mod_cases`, numbered per server) and optionally posted to a mod-log channel.

- Config: `moderationModuleConfig` in `@forgely/shared` (mod-log channel, DM the member or not).
  Disabled until switched on per guild.
- `moderation.service.ts` is the logic. It talks to Discord only through the `ModerationApi` port
  (`discord-moderation-api.ts` is the discord.js implementation), so it is tested with fakes.
- Order of operations: check hierarchy → (DM first for ban/kick) → act → record case → (DM after
  for timeout/warn) → post to mod log. A failed action records nothing. A failed mod-log post or DM
  never fails the command.
- Hierarchy rules (`hierarchy.ts`) mirror Discord: nobody moderates themselves, the bot, the owner,
  or a member whose top role is equal to or above theirs (or the bot's).
- Commands also re-check the moderator's permission, since admins can loosen Discord's per-command
  defaults.
- Purge uses bulk delete, which Discord limits to messages under 14 days old and 100 at a time.
- Bans may target users who already left; every other action needs a current member.
