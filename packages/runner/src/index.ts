// Types
export type {
  ClaimContext,
  VerificationResult,
  StepResult,
  RunnerConfig,
  FetchFn,
  ClaimVerificationResult,
  ProfileData,
  ClaimData,
  VerifyOptions,
  ProfileOptions,
  IdentityMetadata,
  ProofDetails,
  ProofTargetResult,
} from "./types.js";
export { ClaimStatus } from "./types.js";

// Template interpolation
export { interpolate } from "./interpolate.js";

// Expect matchers
export { checkExpect } from "./expect.js";

// Individual actions
export { httpGet } from "./actions/http-get.js";
export { jsonPath } from "./actions/json-path.js";
export { cssSelect } from "./actions/css-select.js";
export { regexMatch } from "./actions/regex-match.js";
export { dnsTxt } from "./actions/dns-txt.js";

// Claim & Profile (from runner)
export { createClaim, matchClaim, verifyClaim, isClaimAmbiguous, getMatchedProvider, isValidDid } from "./claim.js";
export type { ClaimState } from "./claim.js";
export { fetchProfile, resolvePds, verifyAllClaims, getProfileSummary, getClaimsByStatus } from "./profile.js";
export type { FetchedProfile } from "./profile.js";

// Constants
export { COLLECTION_NSID, DEFAULT_TIMEOUT, PUBLIC_API_URL, PLC_DIRECTORY_URL } from "./constants.js";

// Service providers
export * as serviceProviders from "./serviceProviders/index.js";
export type { ServiceProvider, ServiceProviderMatch, ServiceProviderUI, ExtraInput, ProofTarget, ProofRequest, ProcessedURI } from "./serviceProviders/types.js";

// Fetchers
export * as fetchers from "./fetchers/index.js";
