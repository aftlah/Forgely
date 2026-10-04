# @forgely/bot

The Discord bot (discord.js v14, slash commands only). Each feature is a module under `src/modules/`.

## Run locally

1. `pnpm infra:up` (from the repo root) to start Postgres. Redis is optional in development.
2. `cp apps/bot/.env.example apps/bot/.env` and fill in the Discord values.
3. `pnpm db:migrate` with `DATABASE_URL` set.
4. `pnpm --filter @forgely/bot deploy-commands` to register slash commands.
5. `pnpm --filter @forgely/bot dev`.

Production: `pnpm --filter @forgely/bot build`, then `pnpm --filter @forgely/bot start`. That runs
`dist/main.js`, a ClusterManager that spawns `dist/bot.js` per cluster.

## Test

`pnpm --filter @forgely/bot test`. Tests mock Discord, Redis, and the database; none hit the network.
