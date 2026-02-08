// Main exports
export { Claim, isValidDid } from "./claim.js";
export { Profile, resolvePds } from "./profile.js";

// Types
export { ClaimStatus } from "./types.js";
export type { ClaimVerificationResult, ProfileData, ClaimData, VerifyOptions } from "./types.js";

// Constants
export { COLLECTION_NSID, DEFAULT_TIMEOUT, PUBLIC_API_URL, PLC_DIRECTORY_URL } from "./constants.js";

// Service providers
export * as serviceProviders from "./serviceProviders/index.js";
export type {
  ServiceProvider,
  ServiceProviderMatch,
  ProofTarget,
  ProofRequest,
  ProcessedURI,
} from "./serviceProviders/types.js";

// Fetchers
export * as fetchers from "./fetchers/index.js";
