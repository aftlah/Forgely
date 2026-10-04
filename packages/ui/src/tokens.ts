/**
 * Forgely design tokens: "Warm Industrial".
 * Near-black charcoal surfaces, steel neutrals, and ONE ember accent used sparingly
 * (active state, primary action, focus). If something is orange, it should mean "on" or "act here".
 */
export const tokens = {
  color: {
    surface: {
      base: "#141311",
      raised: "#1d1b18",
      overlay: "#26231f",
      inset: "#0e0d0b",
    },
    border: {
      subtle: "#2e2b26",
      strong: "#46423a",
    },
    text: {
      primary: "#ece8df",
      secondary: "#8b8880",
      onEmber: "#141311",
    },
    ember: {
      500: "#ff5a1f",
      600: "#e04612",
      700: "#b8340a",
    },
    status: {
      success: "#7fb069",
      warning: "#e0a526",
      danger: "#e5484d",
    },
  },
  font: {
    display: '"Archivo", "Helvetica Neue", Arial, sans-serif',
    body: '"Hanken Grotesk", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, Consolas, monospace',
  },
  /** Major-third-ish scale in px; line heights are unitless. */
  fontSize: {
    xs: { size: 12, lineHeight: 1.5 },
    sm: { size: 14, lineHeight: 1.5 },
    base: { size: 16, lineHeight: 1.6 },
    lg: { size: 20, lineHeight: 1.4 },
    xl: { size: 28, lineHeight: 1.2 },
    "2xl": { size: 40, lineHeight: 1.1 },
    "3xl": { size: 64, lineHeight: 1.0 },
    "4xl": { size: 104, lineHeight: 0.95 },
  },
  /** 4px base grid. */
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 24: 96 },
  /** Crisp edges: radii stay small on purpose. */
  radius: { none: 0, sm: 2, md: 4, full: 9999 },
  /** Hard, offset shadows only. There are no soft blurred shadows in this system. */
  shadow: {
    raised: "3px 3px 0 #000000",
    ember: "3px 3px 0 #ff5a1f",
    focusRing: "0 0 0 2px #141311, 0 0 0 4px #ff5a1f",
  },
  motion: {
    fast: "120ms",
    base: "200ms",
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
} as const;

export type Tokens = typeof tokens;
