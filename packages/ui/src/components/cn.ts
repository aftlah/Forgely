/** Joins class names, skipping falsy values. Enough for our needs without another dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
