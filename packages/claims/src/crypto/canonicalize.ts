/**
 * Canonicalize a value according to RFC 8785 (JSON Canonicalization Scheme).
 * https://datatracker.ietf.org/doc/html/rfc8785
 *
 * This ensures deterministic JSON output for cryptographic signing by:
 * - Sorting object keys by UTF-16 code units
 * - Serializing numbers per ES2020 Number.toString() (no -0, no NaN/Infinity)
 * - No optional whitespace
 * - Proper string escaping per RFC 8259
 */
export function canonicalize(data: unknown): string {
  return serialize(data);
}

function serialize(value: unknown): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";

    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("RFC 8785: Cannot serialize Infinity or NaN");
      }
      // RFC 8785 Section 3.2.2.3: -0 must be serialized as 0
      if (Object.is(value, -0)) {
        return "0";
      }
      // Use ES Number.toString() which produces RFC 8785 compliant output
      return String(value);

    case "string":
      // JSON.stringify handles RFC 8259 string escaping
      return JSON.stringify(value);

    case "object":
      if (Array.isArray(value)) {
        return "[" + value.map(serialize).join(",") + "]";
      }
      return serializeObject(value as Record<string, unknown>);

    default:
      throw new Error(`RFC 8785: Cannot serialize value of type ${typeof value}`);
  }
}

/**
 * Serialize an object with keys sorted by UTF-16 code units per RFC 8785 Section 3.2.3.
 */
function serializeObject(obj: Record<string, unknown>): string {
  // RFC 8785: Sort keys by comparing UTF-16 code units
  const keys = Object.keys(obj).sort((a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const diff = a.charCodeAt(i) - b.charCodeAt(i);
      if (diff !== 0) return diff;
    }
    return a.length - b.length;
  });

  const pairs: string[] = [];
  for (const key of keys) {
    const val = obj[key];
    // Skip undefined values (not valid in JSON)
    if (val !== undefined) {
      pairs.push(JSON.stringify(key) + ":" + serialize(val));
    }
  }

  return "{" + pairs.join(",") + "}";
}
