/**
 * Extract data from a JSON string (or parsed object) using a simple dot-notation path.
 *
 * Supports paths like:
 *   "$.keytrace"      -> obj.keytrace
 *   "$.data.name"     -> obj.data.name
 *   "$.items[0].id"   -> obj.items[0].id
 *
 * The leading "$." is optional.
 */
export function jsonPath(data: string | object, selector: string): unknown {
  const obj = typeof data === "string" ? JSON.parse(data) : data;

  // Strip leading $. if present
  const path = selector.startsWith("$.") ? selector.slice(2) : selector;

  // Split on dots and bracket notation
  const segments = path.split(/\.|\[(\d+)\]/).filter((s) => s !== "" && s !== undefined);

  let current: unknown = obj;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
