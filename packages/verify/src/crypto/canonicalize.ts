/**
 * Canonicalize an object for signing: sort keys recursively and JSON.stringify.
 * This ensures the same data always produces the same bytes for signing.
 */
export function canonicalize(data: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(data));
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}
