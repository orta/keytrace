import type { ClaimContext } from "./types.js";

/**
 * Interpolate {variable} placeholders in a template string using claim context.
 *
 * Replaces:
 *   {claimId} - from context.claimId
 *   {did}     - from context.did
 *   {handle}  - from context.handle
 *   {anyKey}  - from context.params[anyKey]
 */
export function interpolate(template: string, context: ClaimContext): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    if (key === "claimId") return context.claimId;
    if (key === "did") return context.did;
    if (key === "handle") return context.handle;
    if (key in context.params) return context.params[key];
    return `{${key}}`;
  });
}
