# @forgely/ui

Design tokens and (from Phase 3) the customized shared components. `src/tokens.ts` is the single
source of truth for the visual system, "Warm Industrial". Tailwind and CSS variables are generated
from it; do not hardcode colors, sizes, or radii in app code.

Contrast notes (WCAG AA, measured against `surface.base`): `text.primary` ≈ 16:1, `text.secondary` ≈ 5.4:1,
`ember.500` ≈ 6:1. Use `text.onEmber` (dark) on ember backgrounds, never white.
