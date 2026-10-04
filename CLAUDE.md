# Forgely: working notes for Claude

Forgely is an AI-powered all-in-one Discord bot with a web dashboard and an AI Server Builder.
Target: international, general-purpose communities. **Product UI and bot replies are in English.**
**Talk to the owner in Bahasa Indonesia; write all code, comments, commits, and docs in English.**
The product name is **Forgely** (package scope `@forgely/*`).

## Status

- Phase 1 (foundation): done. See "Roadmap" for what comes next.
- Deploy target is undecided: bot on a VPS (Docker); dashboard on Vercel or the same VPS.

## Local environment notes

- Local Postgres runs in Docker on host port **54320** (not 5432/5433: the owner's machine already has
  native Postgres instances on those). `DATABASE_URL=postgres://forgely:forgely@localhost:54320/forgely`.
- Docker Hub blob downloads fail on the owner's network (CDN EOF). Images are pre-pulled/tagged locally
  (`postgres:18` is a tag of the local `postgres:latest`). Redis sits behind the `redis` compose profile.
- `REDIS_URL` is optional in development (in-memory config cache, single process) and **required in
  production** (enforced in `config/env.ts`). Phase 3 (dashboard sync) and Phase 4 (BullMQ) need Redis.

- **Run exactly one bot process per token.** Every running instance logs in and answers every
  interaction, so duplicates cause double cases, "Interaction has already been acknowledged", and
  "Unknown interaction" errors. On Windows, stopping a `pnpm exec tsx ...` wrapper (`timeout`, task
  stop, closing a shell) leaves the child `node` process alive. Before starting a bot, check:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? CommandLine -match 'src[\\/]bot\.ts'`
  and kill strays (children too, not just the pnpm wrapper).

## Stack

Turborepo + pnpm 9 workspaces, Node 22, TypeScript 5 (strict), discord.js v14 (slash commands only),
discord-hybrid-sharding, PostgreSQL + Drizzle ORM, Redis (ioredis; BullMQ from Phase 4), Zod 4,
Pino + Sentry, Vitest, ESLint (flat config) + Prettier, Husky + lint-staged + commitlint.
Dashboard (Phase 3): Next.js App Router, Tailwind, shadcn/ui (customized), Auth.js with Discord OAuth.
AI (Phase 4): Anthropic Claude API with tool use, output validated by Zod.

## Commands

| Command                                      | Does                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| `pnpm infra:up` / `infra:down`               | Start/stop local Postgres + Redis (Docker Compose)             |
| `pnpm db:generate --name <name>`             | Generate a Drizzle migration from `packages/db/src/schema`     |
| `pnpm db:migrate`                            | Apply migrations (needs `DATABASE_URL`)                        |
| `pnpm typecheck` / `lint` / `test`           | Run across the monorepo via Turbo                              |
| `pnpm format`                                | Prettier write                                                 |
| `pnpm --filter @forgely/bot dev`             | Run the bot with reload (single client, reads `apps/bot/.env`) |
| `pnpm --filter @forgely/bot deploy-commands` | Register slash commands with Discord                           |

At the end of every phase: typecheck, lint, tests all green, then summarize.

## Architecture

```
apps/bot/src
  core/      client, module registry, command router, error handler, logger, composition root (app.ts)
  config/    env.ts: the only reader of process.env
  sync/      guild config service (Redis cache → DB → defaults), Redis pub/sub subscriber
  modules/   one folder per feature; modules/index.ts lists them
packages/
  db/        schema, migrations, client, shared repositories
  shared/    errors, constants, versioned module-config helpers, sync message schemas, permission helpers
  ui/        design tokens
  config/    tsconfig / eslint / prettier
```

Layering: **Discord handler / Next.js route → service → repository.** Handlers stay thin: no DB
queries or business logic in command/event handlers or React components. Dependencies are passed as
parameters (`createXService({ repository, cache, logger })`); there is no DI framework.
`core/app.ts` is the single composition root.

Config flow: dashboard saves a module config row → publishes `{ guildId, moduleId }` on the
`forgely:config-updated` Redis channel (`REDIS_CHANNELS`) → bot invalidates that cache key → next
read reloads from DB. Cache TTL is 5 minutes so a missed pub/sub message self-heals. All per-guild
state must live in Redis/DB, never in process memory, so sharding keeps working.

Module enablement: a module with a `config` definition is gated per guild by `is_enabled`
(default off); the command router enforces it. A module without `config` (like `system`) is always on.

## How to add a bot module

1. Create `apps/bot/src/modules/<module-id>/` (kebab-case) with: `index.ts`, `commands/`, `events/`,
   `<module-id>.service.ts`, `<module-id>.repository.ts`, `*.test.ts`, and a short `README.md`.
2. Define the config with `defineModuleConfig({ moduleId, version, schema, defaults, upgrades? })`
   in `packages/shared` (so the dashboard can import the same schema). Bump `version` and add an
   `upgrades[oldVersion]` step whenever the shape changes.
3. If the module needs tables, edit `packages/db/src/schema`, run `pnpm db:generate --name <descriptive_name>`.
   Put module-specific queries in the module's repository.
4. Write the service (business logic, pure and testable) and keep commands/events thin: parse input,
   call the service, reply. Throw `ForgelyError` subclasses for expected failures.
5. Export `defineModule({ id, commands, events, config })` from `index.ts` and add it to `modules/index.ts`.
   Guild-only commands must call `.setContexts(InteractionContextType.Guild)`.
6. If it needs a new gateway intent, add it in `core/client.ts` with a comment saying why.
   Add tests next to the code; mock Discord and Redis.

## Conventions

- TypeScript strict; no `any` without a comment justifying it; explicit return types on exports.
- Names: files kebab-case; components/types PascalCase; functions/variables camelCase. Functions are
  verbs (`calculateLevelFromXp`); booleans read as questions (`isTicketClaimed`, `hasModPermission`).
- Functions ≲ 40 lines, files ≲ 300 lines. Early returns; no nested ternaries; no magic numbers
  (use named constants; `constants.ts` files are exempt from that lint rule). ESLint enforces these.
- Comments explain _why_, not what. TSDoc on exported functions, services, and public types.
- Import order: builtin → external → `@forgely/*` → relative, alphabetized, blank line between groups.
  Use `@forgely/*` aliases, never long relative paths across packages.
- Errors: throw typed `ForgelyError` subclasses (`PermissionError`, `ValidationError`, `DiscordApiError`,
  `NotFoundError`, `ModuleDisabledError`) with a safe `userMessage`. `handleCommandError` is the single
  place turning errors into replies/logs; never swallow errors silently.
- Logging: Pino, with `guildId`, `userId`, `module`, `command` context (the router builds a child logger).
- Validate all external input with Zod: env (`config/env.ts`, fail fast), Discord inputs, dashboard
  API bodies, AI output. Snowflakes are strings, never numbers.
- DB changes only through Drizzle migrations with descriptive names; never edit an applied migration.
- Tests: Vitest, `*.test.ts` next to the code; services and pure logic first; no real network.
- Commits: Conventional Commits, small and focused. Husky runs lint-staged (Prettier) and commitlint.
- Never hardcode or commit secrets. Every app has a `.env.example`.
- Remove dead code, unused exports, and stray `console.log` (the `no-console` rule enforces it).

## Design tokens ("Warm Industrial")

Source of truth: `packages/ui/src/tokens.ts`. Near-black charcoal surfaces (`#141311`, `#1d1b18`),
steel text/neutrals (`#8b8880`), one ember accent (`#ff5a1f`) used only for active/primary/focus.
Fonts: Archivo (display), Hanken Grotesk (body), JetBrains Mono (IDs/numbers). Crisp edges
(radius ≤ 4px), hard offset shadows only (no blurred soft shadows), 4px spacing grid. Dark text on
ember backgrounds. Landing page may borrow editorial layout and paper tones (see `_prototype`).

**UI hard bans:** purple/blue/pink gradients, gradient text, glow blobs, aurora backgrounds;
glassmorphism/backdrop-blur everywhere; sparkle ✨ / magic-wand AI imagery; emojis as icons
(use lucide-react); generic copy ("supercharge", "unlock the power", "seamless", "elevate",
"next-level", "revolutionize"); fake stats/testimonials/logos; the centered-hero → 3 icon cards →
pricing → FAQ template; everything centered/rounded-2xl/same soft shadow; uncustomized shadcn;
decorative animation. Motion only communicates state, respects `prefers-reduced-motion`.
Accessibility: WCAG AA, visible focus, semantic HTML; responsive at mobile/tablet/desktop.
After each major page, review it against this list.

## Roadmap

- Phase 1: foundation (done). Monorepo, tooling, db, env, logger, errors, module registry, bot boot, config cache + pub/sub, tokens.
- Phase 2a: welcome/goodbye, moderation + mod log. 2b: automod, leveling, tickets, button/reaction roles.
- Phase 3a: Auth.js + server picker + dashboard shell + components. 3b: per-module settings with live save, landing page.
- Phase 4a: `packages/ai` (prompt, tool schema, plan Zod schema, repair, diff). 4b: preview/diff UI, BullMQ apply job, history.
- Out of scope now (design so they can be added): payments/Pro (`guilds.plan` is reserved), AI moderation, analytics, giveaways, template marketplace, multi-language.

## Risks to remember

- Privileged intents (MessageContent, GuildMembers) must be enabled in the Developer Portal and need
  Discord verification above 100 servers.
- Discord limits: 500 channels and 250 roles per guild; rate limits on channel/role creation.
- AI Builder: user text is untrusted (prompt injection). The model may only emit a plan through the
  tool schema; reject dangerous permissions; delete nothing the user did not explicitly select.
- Ticket transcripts store message content: needs a retention policy and privacy-page disclosure.
