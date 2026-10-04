# leveling module

XP for chatting, levels, role rewards, `/rank`, and `/leaderboard`.

- Config: `levelingModuleConfig` in `@forgely/shared` (XP range, cooldown, level-up message and where it goes,
  role rewards). Disabled until switched on per server.
- Every counted message awards a random amount between `min` and `max`, at most once per cooldown.
  The cooldown check and the XP update are a single SQL statement (`awardXp`), so simultaneous messages
  cannot both be rewarded. The cooldown lives in the database, not in memory, so it survives restarts
  and works across shards.
- The curve (`xp-math.ts`): level n to n + 1 costs 5n² + 50n + 100 XP. `calculateLevelFromXp` is the
  inverse of `xpForLevel` (a test checks this for 300 levels).
- Role rewards: on a level-up the member gets every reward at or below the new level, so a reward added
  later is picked up at the next level-up.
- Announcing and granting roles fail independently and are logged, never thrown.
- Only the member who levelled up can be pinged, never `@everyone`, `@here`, or roles. `/leaderboard`
  shows mentions without pinging.
- Needs only the Guilds and GuildMessages intents. It never reads message text, so it does **not** need
  the privileged Message Content intent.
