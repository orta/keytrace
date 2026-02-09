/**
 * Parse an expect string and compare against a value.
 *
 * Supported formats:
 *   "equals:{value}"   - exact string match
 *   "contains:{value}" - substring match
 */
export function checkExpect(expectStr: string, actual: unknown): { pass: boolean; message: string } {
  const colonIdx = expectStr.indexOf(":");
  if (colonIdx === -1) {
    return {
      pass: false,
      message: `Invalid expect format: "${expectStr}" (expected "type:value")`,
    };
  }

  const type = expectStr.slice(0, colonIdx);
  const expected = expectStr.slice(colonIdx + 1);
  const actualStr = String(actual ?? "");

  switch (type) {
    case "equals":
      return actualStr === expected ? { pass: true, message: `Value equals "${expected}"` } : { pass: false, message: `Expected "${expected}" but got "${actualStr}"` };

    case "contains":
      return actualStr.includes(expected)
        ? { pass: true, message: `Value contains "${expected}"` }
        : {
            pass: false,
            message: `Expected value to contain "${expected}" but got "${actualStr}"`,
          };

    default:
      return { pass: false, message: `Unknown expect type: "${type}"` };
  }
}
