# Forgely

An all-in-one Discord bot with a web dashboard and an AI Server Builder. Monorepo managed with
Turborepo and pnpm. See `CLAUDE.md` for architecture and conventions.

| Path              | What it is                                               |
| ----------------- | -------------------------------------------------------- |
| `apps/bot`        | discord.js bot (slash commands, modules, sharding-ready) |
| `packages/db`     | Drizzle schema, migrations, repositories                 |
| `packages/shared` | Zod schemas, typed errors, constants, permission helpers |
| `packages/ui`     | Design tokens (components arrive in Phase 3)             |
| `packages/config` | Shared TypeScript, ESLint, Prettier config               |
| `brand`           | Logo files and usage rules                               |

## Quick start

```sh
pnpm install
pnpm infra:up          # Postgres on localhost:54320 (add Redis: docker compose --profile redis up -d)
cp apps/bot/.env.example apps/bot/.env   # then fill in Discord values
DATABASE_URL=postgres://forgely:forgely@localhost:54320/forgely pnpm db:migrate
pnpm --filter @forgely/bot deploy-commands
pnpm --filter @forgely/bot dev
```

## Checks

`pnpm typecheck && pnpm lint && pnpm test`
