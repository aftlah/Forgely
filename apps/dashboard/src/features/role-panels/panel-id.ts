const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const PANEL_ID_LENGTH = 8;

/**
 * A new panel's ID: 8 random characters from a-z and 0-9, matching `panelIdSchema` in @forgely/shared.
 * Made in the browser, so it uses the browser's cryptographic random source rather than Math.random.
 */
export function generatePanelId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PANEL_ID_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
