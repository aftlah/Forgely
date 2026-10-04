/**
 * Deep equality for plain JSON-like data (objects, arrays, strings, numbers, booleans, null).
 * Decides whether a settings form has unsaved changes. Array order matters.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}
