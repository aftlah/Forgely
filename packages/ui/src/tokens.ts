/**
 * Forgely design tokens: "Warm Industrial", prompt-first.
 * Structure borrows from modern bot dashboards (floating pill nav, prompt box in the hero, pill
 * buttons, dot-grid backdrop). Identity stays ours: warm charcoal surfaces, steel text, and ONE
 * ember accent. If something is orange it means "primary action", "on", or "focus".
 */
export const tokens = {
  color: {
    surface: {
      base: "#121110",
      raised: "#1a1816",
      overlay: "#24211d",
      inset: "#0c0b0a",
    },
    border: {
      subtle: "#2e2b26",
      strong: "#46423a",
    },
    text: {
      primary: "#ece8df",
      secondary: "#9a968d",
      onEmber: "#141311",
      onBone: "#141311",
    },
    /** Light surface used for the primary pill button and the light landing sections. */
    bone: "#ece8df",
    ember: {
      /** Lighter shade, used for hover on ember fills. */
      400: "#ff7440",
      500: "#ff5a1f",
      600: "#e04612",
      700: "#b8340a",
    },
    status: {
      success: "#7fb069",
      warning: "#e0a526",
      danger: "#e5484d",
    },
    /** Faint dots for the page backdrop. The only decorative texture in the system. */
    dot: "rgba(236, 232, 223, 0.07)",
  },
  font: {
    display: '"Archivo", "Helvetica Neue", Arial, sans-serif',
    body: '"Hanken Grotesk", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, Consolas, monospace',
  },
  /** Display type uses Archivo at 112% width, bold, with tight tracking. */
  display: { stretch: "112%", weight: 700, tracking: "-0.03em" },
  fontSize: {
    xs: { size: 12, lineHeight: 1.5 },
    sm: { size: 14, lineHeight: 1.5 },
    base: { size: 16, lineHeight: 1.6 },
    lg: { size: 20, lineHeight: 1.4 },
    xl: { size: 28, lineHeight: 1.2 },
    "2xl": { size: 40, lineHeight: 1.1 },
    "3xl": { size: 64, lineHeight: 1.0 },
    "4xl": { size: 96, lineHeight: 0.98 },
  },
  /** 4px base grid. */
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 24: 96 },
  /**
   * Pills for nav and buttons, generous radius for the prompt box and panels, small radius for
   * dense dashboard controls. Never mix more than these four.
   */
  radius: { sm: 8, md: 14, lg: 22, full: 9999 },
  /** Depth comes from borders and surface steps, not blurred shadows. */
  shadow: {
    none: "none",
    focusRing: "0 0 0 2px #121110, 0 0 0 4px #ff5a1f",
  },
  motion: {
    fast: "120ms",
    base: "200ms",
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
} as const;

export type Tokens = typeof tokens;
