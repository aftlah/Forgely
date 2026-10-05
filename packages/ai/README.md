# @forgely/ai

The AI Builder's brain. No Discord and no database in here: it turns a description plus the server's existing
names into a validated plan, and compares a plan with what already exists.

- `plan.ts`: the plan schema (Zod) and limits. Deliberately cannot express permissions, deletions, or renames.
- `normalize.ts`: clean names (no mentions or markup) and Discord-style channel slugs.
- `provider.ts`: the `AiProvider` port. `gemini-provider.ts` is the Gemini adapter (REST, structured JSON,
  retry with backoff, then a fallback model). Swap the provider without touching anything else.
- `prompt.ts`: the system prompt (the description is untrusted and fenced) and the repair prompt.
- `generate-plan.ts`: asks the model, validates, and gives it one chance to repair an invalid answer.
- `diff-plan.ts`: `diffPlan` marks items new or existing; `selectPlan` applies the user's ticks.

`pnpm --filter @forgely/ai test` runs everything with a fake provider and fake `fetch`; no network is used.
