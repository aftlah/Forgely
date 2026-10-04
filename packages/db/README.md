# @forgely/db

Drizzle schema, migrations, database client, and the repositories shared by the bot and dashboard.
Feature-specific repositories live next to their feature (for example in the bot's `modules/`).

- Start local Postgres: `pnpm infra:up` (from the repo root)
- Generate a migration after editing `src/schema`: `pnpm db:generate --name <descriptive_name>`
- Apply migrations: `pnpm db:migrate` (needs `DATABASE_URL`)
- Never edit the database by hand or edit a generated migration that has already been applied.
