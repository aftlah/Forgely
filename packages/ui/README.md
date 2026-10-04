# @forgely/ui

Design tokens and (from Phase 3) the customized shared components. `src/tokens.ts` is the single
source of truth for the visual system, "Warm Industrial, prompt-first". Tailwind and CSS variables
are generated from it; do not hardcode colors, sizes, or radii in app code.

See the "Design system" section of the root `CLAUDE.md` for the rules, and `brand/README.md` for the
logo. `apps/dashboard` shows the system applied to the landing page and dashboard.

Contrast notes (WCAG AA, measured on `surface.base`): `text.primary` ≈ 15:1, `text.secondary`
≈ 6:1, `ember.500` ≈ 6:1. Use `text.onEmber` (dark) on ember backgrounds and `text.onBone` on bone
buttons, never white.
