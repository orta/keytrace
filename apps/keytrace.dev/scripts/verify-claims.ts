#!/usr/bin/env npx tsx
/**
 * CLI script to verify keytrace claims for a handle.
 *
 * Usage: npx tsx scripts/verify-claims.ts <handle>
 * Example: npx tsx scripts/verify-claims.ts kitten.sh
 */

import { getClaimsForHandle } from "@keytrace/claims";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function c(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

async function main() {
  const handle = process.argv[2];

  if (!handle) {
    console.error("Usage: npx tsx scripts/verify-claims.ts <handle>");
    console.error("Example: npx tsx scripts/verify-claims.ts kitten.sh");
    process.exit(1);
  }

  console.log(c("bold", `\nVerifying claims for ${c("cyan", handle)}...\n`));

  try {
    const result = await getClaimsForHandle(handle);

    // Header
    console.log(c("dim", "─".repeat(60)));
    console.log(c("bold", "Profile"));
    console.log(c("dim", "─".repeat(60)));
    console.log(`  DID:    ${c("blue", result.did)}`);
    if (result.handle) {
      console.log(`  Handle: ${c("cyan", result.handle)}`);
    }
    console.log();

    // Summary
    const { total, verified, failed } = result.summary;
    console.log(c("bold", "Summary"));
    console.log(c("dim", "─".repeat(60)));
    console.log(`  Total claims:    ${total}`);
    console.log(`  Verified:        ${c("green", String(verified))}`);
    console.log(`  Failed:          ${failed > 0 ? c("red", String(failed)) : String(failed)}`);
    console.log();

    if (result.claims.length === 0) {
      console.log(c("yellow", "No claims found for this user."));
      return;
    }

    // Individual claims
    console.log(c("bold", "Claims"));
    console.log(c("dim", "─".repeat(60)));

    for (const claim of result.claims) {
      const status = claim.verified ? c("green", "VERIFIED") : c("red", "FAILED");
      const typeLabel = c("magenta", claim.type.padEnd(12));

      console.log();
      console.log(`  ${status}  ${typeLabel}  ${c("cyan", claim.identity.subject)}`);
      console.log(`  ${c("dim", "Claim URI:")} ${claim.claimUri}`);

      if (claim.identity.displayName) {
        console.log(`  ${c("dim", "Display:")}   ${claim.identity.displayName}`);
      }
      if (claim.identity.profileUrl) {
        console.log(`  ${c("dim", "Profile:")}   ${claim.identity.profileUrl}`);
      }

      // Show verification steps
      console.log(`  ${c("dim", "Steps:")}`);
      for (const step of claim.steps) {
        const stepStatus = step.success ? c("green", "OK") : c("red", "FAIL");
        const stepDetail = step.detail || step.error || "";
        console.log(`    ${stepStatus.padEnd(14)} ${c("dim", step.step.padEnd(20))} ${stepDetail}`);
      }

      if (claim.error) {
        console.log(`  ${c("red", "Error:")} ${claim.error}`);
      }

      // Signature info
      console.log(`  ${c("dim", "Signed at:")} ${claim.claim.sig.signedAt}`);
      console.log(`  ${c("dim", "Record:")}    at://${result.did}/dev.keytrace.claim/${claim.rkey}`);
    }

    console.log();
    console.log(c("dim", "─".repeat(60)));

    // Exit code based on verification status
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(c("red", `Error: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}

main();
