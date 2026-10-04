# @forgely/dashboard

Next.js app (App Router) with the public landing page and the dashboard shell.

- `src/app/(marketing)`: landing page. Static, except the prompt box and plan preview, which are
  client components in `src/features/builder-demo` (a simulation with sample plans, no AI call).
- `src/app/dashboard`: shell with loading, error, and empty states. Login and settings pages come next.
- Styling: Tailwind 4. Colors, fonts, and radii come from `@forgely/ui` (`tokens.ts` generates
  `theme.css`); do not hardcode them here.

## Run

```sh
pnpm --filter @forgely/dashboard dev     # http://localhost:3100
pnpm --filter @forgely/dashboard build && pnpm --filter @forgely/dashboard start
```

Copy `.env.example` to `.env.local`. The landing page only needs `NEXT_PUBLIC_DISCORD_CLIENT_ID`.

## Test

`pnpm --filter @forgely/dashboard test` covers the plan logic. Layout and interaction were checked in
Chrome at 1440, 768, and 390 px (see the Design system section in the root `CLAUDE.md`).
