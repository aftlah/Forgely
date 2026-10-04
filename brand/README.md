# Forgely brand assets

The mark is a flat letter **F**; its lower arm is the ember. One shape, two colors, no gradients.

## Files

| File                                            | Use                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `logo-monogram.svg`                             | **Master.** Mark on a charcoal tile. App icons, avatars, social images.          |
| `logo-mark-light.svg`                           | Mark only, transparent, light F. For dark backgrounds.                           |
| `logo-mark-dark.svg`                            | Mark only, transparent, dark F. For light backgrounds.                           |
| `favicon.svg`                                   | Browser tab icon (copy of the master).                                           |
| `png/avatar-512.png`                            | Discord bot avatar. Upload in Developer Portal → General Information → App Icon. |
| `png/apple-touch-icon-180.png`, `icon-192.png`  | iOS home screen and web app manifest.                                            |
| `png/favicon-16/32/48.png`                      | Raster favicons for older browsers.                                              |
| `png/mark-light-512.png`, `mark-dark-512.png`   | Transparent marks for slides and docs.                                           |
| `png/lockup-on-dark.png`, `lockup-on-light.png` | Mark + "Forgely", transparent, for headers and press.                            |

## Colors

| Name     | Hex       | Use                                    |
| -------- | --------- | -------------------------------------- |
| Charcoal | `#141311` | Tile background, text on light         |
| Bone     | `#ece8df` | The F on dark                          |
| Ember    | `#ff5a1f` | The ember square. Never anything else. |

Paper `#efe9dd` is the background of the light lockup (landing page tone).

## Wordmark

"Forgely" is set in **Archivo Bold at 112% width**, tracking -0.02em, sentence case. The lockup PNGs
are already rendered; to rebuild one in code, use the same font settings and size the mark so the
F is about as tall as the capital letters.

## Rules

- Keep clear space around the mark of at least the width of the ember square.
- Smallest size: 16 px (favicon). Below that, use the master tile, not the transparent mark.
- Do not recolor the ember, add gradients, glows, shadows, or sparkles, rotate the mark, or place the
  light mark on a light background (use the dark mark there).
- Do not redraw the F with a rounded font; the hard corners are the point.
