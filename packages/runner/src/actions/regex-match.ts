/**
 * Match content against a regex pattern.
 * Returns the first capture group if present, otherwise the full match.
 */
export function regexMatch(content: string, pattern: string): string {
  const regex = new RegExp(pattern);
  const match = content.match(regex);
  if (!match) {
    throw new Error(`Pattern "${pattern}" did not match content`);
  }
  // Return first capture group if available, otherwise the full match
  return match[1] ?? match[0];
}
