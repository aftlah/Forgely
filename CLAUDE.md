# Forgely: working notes for Claude

Forgely is an AI-powered all-in-one Discord bot with a web dashboard and an AI Server Builder.
Target: international, general-purpose communities. **Product UI and bot replies are in English.**
**Talk to the owner in Bahasa Indonesia; write all code, comments, commits, and docs in English.**
The product name is **Forgely** (package scope `@forgely/*`).

## Status

- Phase 1 (foundation) and 2a (welcome + moderation): done and verified against real Discord.
- Phase 3 started: `apps/dashboard` (Next.js) holds the landing page and a dashboard shell. Login and
  per-module settings pages are the next steps. See "Roadmap".
- Deploy target is undecided: bot on a VPS (Docker); dashboard on Vercel or the same VPS.

## Local environment notes

- Local Postgres runs in Docker on host port **54320** (not 5432/5433: the owner's machine already has
  native Postgres instances on those). `DATABASE_URL=postgres://forgely:forgely@localhost:54320/forgely`.
- Docker Hub blob downloads fail on the owner's network (CDN EOF). Images are pre-pulled/tagged locally
  (`postgres:18` is a tag of the local `postgres:latest`). Redis sits behind the `redis` compose profile.
- `REDIS_URL` is optional in development (in-memory config cache, single process) and **required in
  production** (enforced in `config/env.ts`). Phase 3 (dashboard sync) and Phase 4 (BullMQ) need Redis.

- The dashboard runs on port **3100** (`pnpm --filter @forgely/dashboard dev`), not 3000: the owner has
  other local projects on 3000. The Discord OAuth redirect to register is
  `http://localhost:3100/api/auth/callback/discord`. The public client ID lives in
  `apps/dashboard/.env.local` as `NEXT_PUBLIC_DISCORD_CLIENT_ID` (not a secret).
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
Dashboard: Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, lucide-react. Built so far with our own
components in `packages/ui` (Button, Switch, Window, LogoMark); shadcn/ui and Auth.js (Discord OAuth)
come with login.
AI (Phase 4): **Gemini API, free tier** (owner decision, 2026-10-04), with structured JSON output
(`responseSchema`) and Zod validation. `packages/ai` defines an `AiProvider` port with a Gemini adapter, so
the provider stays swappable (Claude was the earlier plan). Model names come from env
(`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`; defaults gemini-3.5-flash and gemini-3.5-flash-lite).

## Commands

| Command                                                      | Does                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `pnpm infra:up` / `infra:down`                               | Start/stop local Postgres + Redis (Docker Compose)                    |
| `pnpm db:generate --name <name>`                             | Generate a Drizzle migration from `packages/db/src/schema`            |
| `pnpm db:migrate`                                            | Apply migrations (needs `DATABASE_URL`)                               |
| `pnpm typecheck` / `lint` / `test`                           | Run across the monorepo via Turbo                                     |
| `pnpm format`                                                | Prettier write                                                        |
| `pnpm --filter @forgely/bot dev`                             | Run the bot with reload (single client, reads `apps/bot/.env`)        |
| `pnpm --filter @forgely/bot deploy-commands`                 | Register slash commands with Discord                                  |
| `pnpm --filter @forgely/bot config:set <guildId> <module> on | off [json]`                                                           | Enable a module / change its config from the terminal |
| `pnpm --filter @forgely/dashboard dev`                       | Landing page + dashboard shell at http://localhost:3100               |
| `pnpm --filter @forgely/ui generate:theme`                   | Regenerate `theme.css` after editing `tokens.ts` (a test enforces it) |

At the end of every phase: typecheck, lint, tests all green, then summarize.

## Architecture

```
apps/bot/src
  core/      client, module registry, command router, error handler, logger, composition root (app.ts)
  config/    env.ts: the only reader of process.env
  sync/      guild config service (Redis cache → DB → defaults), Redis pub/sub subscriber
  modules/   one folder per feature; modules/index.ts lists them
apps/dashboard/src
  app/       routes: (marketing) landing page, dashboard/ (shell, loading, error), not-found
  features/  marketing/ (landing sections), builder-demo/ (prompt box + plan preview simulation), dashboard/
  lib/       small helpers (invite URL)
packages/
  db/        schema, migrations, client, shared repositories
  shared/    errors, constants, versioned module-config helpers, sync message schemas, permission helpers, bot invite URL
  ui/        design tokens (tokens.ts → generated theme.css) and shared components
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

## Design system ("Warm Industrial", prompt-first)

**Decision (owner, 2026-10-04):** use the _structure and flow_ of peakbot.pro, with Forgely's own
identity. Do not copy its palette, copy, or assets, and do not use its purple glow or its unverifiable
"trusted by N communities" claim. The owner explicitly chose this over a closer visual match.

- **Structure to follow:** floating pill nav with a "Log in with Discord" pill; hero whose centerpiece is
  a prompt box ("describe your server") with example chips; white/bone pill primary button and dark
  ghost pill secondary; faint dot-grid backdrop; product shown for real (plan diff preview, dashboard
  window), not illustrated; dashboard in a studio style (sidebar per module, panel with switches).
- **Identity:** warm charcoal surfaces (`#121110`, `#1a1816`), steel text (`#9a968d`), bone `#ece8df`,
  ONE ember accent `#ff5a1f` for primary action / "on" / focus. Dark text on ember and bone fills.
  Fonts: Archivo Bold at 112% width (display), Hanken Grotesk (body), JetBrains Mono (IDs, labels).
- **Shape:** pills for nav and buttons, radius 22 for the prompt box and panels, 8-14 for dense
  controls. Depth from borders and surface steps; no blurred shadows. 4px spacing grid.
- Source of truth: `packages/ui/src/tokens.ts`. Brand assets and logo rules: `brand/README.md`.
  The landing page in `apps/dashboard` is the reference implementation (verified in Chrome at 1440, 768, and 390px).
- Hero is centered because a prompt box wants that; every section below it is asymmetric/editorial.

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
- Phase 3a: landing page + dashboard shell + shared components (done). Next: Auth.js login, server picker, per-module settings with live save.
  3b: remaining module pages. Dashboard changes publish on Redis so the bot picks them up live.
- Phase 4a: `packages/ai` (AiProvider port + Gemini adapter, prompt, response schema, plan Zod schema, repair, diff). 4b: preview/diff UI, BullMQ apply job, history.
- Out of scope now (design so they can be added): payments/Pro (`guilds.plan` is reserved), AI moderation, analytics, giveaways, template marketplace, multi-language.

## AI provider notes (verified against the owner's key, 2026-10-04)

- Structured output works on the free key: gemini-3.5-flash, 3.5-flash-lite, 3.7-flash, and 3.8-flash
  returned valid, schema-conforming JSON. gemini-2.5-* returned 404 "no longer available to new users".
- **503 "high demand" happens** (seen on 3.6-flash, flash-latest, and once on 3.8-flash). The client needs
  retry with backoff, then the fallback model, then a clear user message. Never assume a call succeeds.
- Free-tier quotas are small and change. Enforce a per-guild daily limit and queue builds.
- **Privacy:** send only server structure (category, channel, and role names, plus permission overwrites)
  and the user's description. Never send message content or member names. As far as I know, Google may use
  free-tier prompts to improve its products; verify in the Gemini API terms and disclose it on the
  privacy page.
- Keys live only in env files (`apps/dashboard/.env.local`, gitignored). Never log or echo them.

## Risks to remember

- Privileged intents (MessageContent, GuildMembers) must be enabled in the Developer Portal and need
  Discord verification above 100 servers.
- Discord limits: 500 channels and 250 roles per guild; rate limits on channel/role creation.
- AI Builder: user text is untrusted (prompt injection). The model may only emit a plan through the
  tool schema; reject dangerous permissions; delete nothing the user did not explicitly select.
- Ticket transcripts store message content: needs a retention policy and privacy-page disclosure.
