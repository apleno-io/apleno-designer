export function deepEqual(a: unknown, b: unknown): boolean {
  // Primitive types (NaN !== NaN by IEEE 754, so two NaN values are not considered equal)
  if (a === b) {
    return true;
  }

  // Check objects
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  // Date
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }

  // RegExp
  if (a instanceof RegExp || b instanceof RegExp) {
    return a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  }

  // Map, Set, ArrayBuffer and other built-ins are not supported
  if (
    a instanceof Map || a instanceof Set || a instanceof ArrayBuffer ||
    b instanceof Map || b instanceof Set || b instanceof ArrayBuffer
  ) {
    return false;
  }

  // Arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // Objects
  const keysA = Object.keys(a);
  const keysB = new Set(Object.keys(b));
  if (keysA.length !== keysB.size) {
    return false;
  }
  for (const key of keysA) {
    if (!keysB.has(key) || !deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}