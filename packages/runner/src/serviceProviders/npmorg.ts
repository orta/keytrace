import type { AccessContext, ServiceProvider } from "./types.js";
import { KEYTRACE_ORG_PACKAGE_PREFIX, assertScopeKind, packumentPublisherOf, scopeAccessRequest, scopeKindRequest, type Packument } from "./npmRegistry.js";

/**
 * npm organization service provider
 *
 * Users prove they can publish under an npm org scope by publishing
 * @org/keytrace-claim-<their-npm-username> with their DID in the package.json did field.
 * Publishing into a scope requires write access to it.
 *
 * The package is named after the publisher so that every member of an org can make their own
 * claim without republishing over each other's package.
 *
 * Unlike the `npm` provider, the subject here is a shared namespace rather than a personal
 * account, so the claim records both: subject is the org scope, account is the npm user who
 * published the proof. Several people can hold the same subject simultaneously.
 *
 * The package outlives the permission that created it — it stays in the org after its publisher
 * leaves — so `verifyAccess` re-checks the live ACL rather than trusting the package's existence.
 */
const npmorg: ServiceProvider = {
  id: "npmorg",
  name: "npm organization",
  homepage: "https://www.npmjs.com",

  // Any package under the scope, so the `did` field can go into a package the org already
  // publishes rather than forcing a throwaway. The package name carries no authority — the
  // person is identified by `_npmUser` on the version holding the DID.
  //
  // This overlaps the `npm` provider on @scope/keytrace and @scope/keytrace-claim, which no
  // regex can split: only the registry knows whether a scope is a person or an org. `npm` is
  // marked ambiguous so it gets first refusal and falls through to here when the scope is an org.
  reUri: /^https:\/\/(?:www\.)?npmjs\.com\/package\/@([a-z0-9][a-z0-9._-]*)\/([a-z0-9][a-z0-9._-]*)\/?$/i,

  isAmbiguous: false,

  ui: {
    description: "Link via an npm organization",
    icon: "npm",
    iconDisplay: "raw",
    inputLabel: "npm package URL, or paste the line npm prints on publish like '+ @your-org/your-package@1.2.3'",
    inputPlaceholder: "https://www.npmjs.com/package/@yourorg/keytrace-claim-yournpmuser",
    inputDefaultTemplate: undefined,
    instructions: [
      "Add the `did` field below to the `package.json` of any package under your org's scope — an existing one works, or create a new one",
      "Run `npm publish --access public` to publish a version containing it",
      "Paste the package URL below, or the `+ @your-org/your-package@1.2.3` line npm prints",
    ],
    proofTemplate: `{
  "name": "@{your-org}/${KEYTRACE_ORG_PACKAGE_PREFIX}{your-npm-username}",
  "version": "0.0.1",
  "did": "{did}",
  "publishConfig": {
    "access": "public"
  }
}`,
  },

  processURI(_uri, match) {
    const scope = match[1].toLowerCase();
    const pkg = match[2].toLowerCase();

    return {
      profile: {
        display: `@${scope}`,
        uri: `https://www.npmjs.com/org/${scope}`,
      },
      proof: {
        request: {
          uri: `https://registry.npmjs.org/@${scope}/${pkg}`,
          fetcher: "http",
          format: "json",
        },
        target: [{ path: ["versions", "*", "did"], relation: "contains", format: "text" }],
      },
    };
  },

  postprocess(data, match, did) {
    const scope = match[1].toLowerCase();
    const packument = data as Packument;

    // Bind to the version carrying *this* DID, not to the package as a whole. Anyone else with
    // write access to the scope can publish a newer version, and taking the publisher of
    // dist-tags.latest would then attribute the claim to them instead of the claimant.
    const account = packumentPublisherOf(packument, did);

    return {
      subject: scope,
      account,
      displayName: `@${scope}`,
      profileUrl: `https://www.npmjs.com/org/${scope}`,
    };
  },

  async verifyAccess(ctx: AccessContext): Promise<string | null> {
    const scope = ctx.match[1].toLowerCase();
    const account = ctx.identity.account;

    if (!account) {
      return `Could not determine which npm user published under @${scope}`;
    }

    // Fails closed, unlike the npm provider's equivalent check: a personal scope is structurally
    // identical to an org scope in the packument, so there is no offline backstop here.
    const kind = await assertScopeKind(scope, () => ctx.fetch(scopeKindRequest(scope)));
    if (kind === "user") {
      return `@${scope} is a personal npm scope, not an organization — claim it with the npm claim type instead`;
    }

    // Public per-user ACL index. Losing org access drops the org's packages out of it, which is
    // the signal the published package itself can never give us. Any package under the scope
    // counts: the claim is "can publish under @scope", not "owns this one package".
    const packages = (await ctx.fetch(scopeAccessRequest(account))) as Record<string, string> | null;
    const hasAccess = !!packages && Object.keys(packages).some((name) => name.toLowerCase().startsWith(`@${scope}/`));

    if (!hasAccess) {
      return `npm user ${account} no longer has publish access under @${scope}`;
    }

    return null;
  },

  getProofText(did, handle) {
    const user = handle ?? "[your-npm-username]";
    return `{
  "name": "@[your-org]/${KEYTRACE_ORG_PACKAGE_PREFIX}${user}",
  "version": "0.0.1",
  "did": "${did}",
  "publishConfig": { "access": "public" }
}`;
  },

  getProofLocation(match) {
    const scope = match?.[1] ? `@${match[1].toLowerCase()}` : "@[your-org]";
    const pkg = match?.[2]?.toLowerCase() ?? `${KEYTRACE_ORG_PACKAGE_PREFIX}[your-npm-username]`;
    return `Publish ${scope}/${pkg} with your DID in the did field of package.json`;
  },

  getRecommendations(data, match) {
    const scope = match[1].toLowerCase();
    const pkg = `@${scope}/${match[2].toLowerCase()}`;
    const packument = data as Packument;
    const recs: string[] = [];

    const versions = Object.keys(packument?.versions ?? {});
    if (versions.length === 0) {
      recs.push(`No published versions found for ${pkg}`);
      return recs;
    }

    const withDid = versions.filter((v) => typeof packument.versions?.[v]?.did === "string");
    if (withDid.length === 0) {
      recs.push(`None of the ${versions.length} published version(s) have a "did" field in package.json — add one and publish a new version`);
    } else {
      const found = withDid.map((v) => `${v}: ${packument.versions![v].did}`).join(", ");
      recs.push(`Found a "did" field, but it does not match this account — ${found}`);
    }

    return recs;
  },

  tests: [
    { uri: "https://www.npmjs.com/package/@acme/keytrace-claim-alice", shouldMatch: true },
    { uri: "https://npmjs.com/package/@acme/keytrace-claim-alice", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/@acme/keytrace-claim-alice/", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/@my-org.name_1/a.b_c", shouldMatch: true },
    // Any package under the scope qualifies, including one the org already publishes
    { uri: "https://www.npmjs.com/package/@acme/design-tokens", shouldMatch: true },
    // Shared with the npm provider, which gets first refusal via isAmbiguous
    { uri: "https://www.npmjs.com/package/@acme/keytrace-claim", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/@acme/keytrace", shouldMatch: true },
    // Unscoped packages have no org to claim
    { uri: "https://www.npmjs.com/package/keytrace-alice", shouldMatch: false },
    // Org pages name no package, so they can't say where the proof lives
    { uri: "https://www.npmjs.com/org/acme", shouldMatch: false },
    { uri: "https://www.npmjs.com/~alice", shouldMatch: false },
  ],
};

export default npmorg;
