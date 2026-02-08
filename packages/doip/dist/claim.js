import { ClaimStatus } from "./types.js";
import { DEFAULT_TIMEOUT } from "./constants.js";
import { matchUri, } from "./serviceProviders/index.js";
import * as fetchers from "./fetchers/index.js";
// did:plc identifiers are base32-encoded, lowercase
const DID_PLC_RE = /^did:plc:[a-z2-7]{24}$/;
// did:web uses a domain name (with optional port and path segments encoded as colons)
const DID_WEB_RE = /^did:web:[a-zA-Z0-9._:%-]+$/;
/**
 * Validate a DID string. Accepts did:plc and did:web formats.
 */
export function isValidDid(did) {
    return DID_PLC_RE.test(did) || DID_WEB_RE.test(did);
}
/**
 * Represents a single identity claim linking a DID to an external account
 */
export class Claim {
    _uri;
    _did;
    _status = ClaimStatus.INIT;
    _matches = [];
    _errors = [];
    constructor(uri, did) {
        this._uri = uri;
        // Validate DID format: must be did:plc:<id> or did:web:<host>
        if (!isValidDid(did)) {
            throw new Error(`Invalid DID format: ${did}`);
        }
        this._did = did;
    }
    get uri() {
        return this._uri;
    }
    get did() {
        return this._did;
    }
    get status() {
        return this._status;
    }
    get matches() {
        return this._matches;
    }
    get errors() {
        return this._errors;
    }
    /**
     * Match the claim URI against known service providers
     */
    match() {
        this._matches = matchUri(this._uri);
        this._status = this._matches.length > 0 ? ClaimStatus.MATCHED : ClaimStatus.ERROR;
        if (this._matches.length === 0) {
            this._errors.push(`No service provider matched URI: ${this._uri}`);
        }
    }
    /**
     * Check if the claim is ambiguous (matches multiple providers)
     */
    isAmbiguous() {
        return this._matches.length > 1 || (this._matches.length === 1 && this._matches[0].isAmbiguous);
    }
    /**
     * Get the matched service provider (first unambiguous match, or first match)
     */
    getMatchedProvider() {
        return this._matches[0];
    }
    /**
     * Verify the claim by fetching proof and checking for DID
     */
    async verify(opts = {}) {
        if (this._status === ClaimStatus.INIT) {
            this.match();
        }
        if (this._matches.length === 0) {
            return {
                status: ClaimStatus.ERROR,
                errors: this._errors,
                timestamp: new Date(),
            };
        }
        // Try each matched provider until one succeeds
        for (const match of this._matches) {
            try {
                const config = match.provider.processURI(this._uri, match.match);
                const proofData = await this.fetchProof(config.proof.request, opts);
                if (this.checkProof(proofData, config.proof.target)) {
                    this._status = ClaimStatus.VERIFIED;
                    return {
                        status: ClaimStatus.VERIFIED,
                        errors: [],
                        timestamp: new Date(),
                    };
                }
            }
            catch (err) {
                this._errors.push(`${match.provider.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
            // Stop on unambiguous match
            if (!match.isAmbiguous)
                break;
        }
        this._status = ClaimStatus.FAILED;
        return {
            status: ClaimStatus.FAILED,
            errors: this._errors,
            timestamp: new Date(),
        };
    }
    async fetchProof(request, opts) {
        const fetcher = fetchers.get(request.fetcher);
        if (!fetcher) {
            throw new Error(`Unknown fetcher: ${request.fetcher}`);
        }
        return fetcher.fetch(request.uri, {
            format: request.format,
            timeout: opts.timeout ?? DEFAULT_TIMEOUT,
            headers: request.options?.headers,
        });
    }
    checkProof(data, targets) {
        const proofPatterns = this.generateProofPatterns();
        for (const target of targets) {
            const values = this.extractValues(data, target.path);
            for (const value of values) {
                if (this.matchesPattern(value, proofPatterns, target.relation)) {
                    return true;
                }
            }
        }
        return false;
    }
    generateProofPatterns() {
        // Patterns to search for in proof locations
        const patterns = [
            this._did, // did:plc:xxx
        ];
        // Also add the short form for did:plc DIDs
        if (this._did.startsWith("did:plc:")) {
            patterns.push(this._did.replace("did:plc:", ""));
        }
        return patterns;
    }
    extractValues(data, path) {
        const results = [];
        this.extractValuesRecursive(data, path, 0, results);
        return results;
    }
    extractValuesRecursive(data, path, index, results) {
        if (data === null || data === undefined)
            return;
        if (index >= path.length) {
            // Reached the end of the path
            if (typeof data === "string") {
                results.push(data);
            }
            else if (Array.isArray(data)) {
                // If it's an array of strings, add them all
                for (const item of data) {
                    if (typeof item === "string") {
                        results.push(item);
                    }
                }
            }
            return;
        }
        const key = path[index];
        if (key === "*" && Array.isArray(data)) {
            // Wildcard: recurse into all array elements
            for (const item of data) {
                this.extractValuesRecursive(item, path, index + 1, results);
            }
        }
        else if (typeof data === "object" && data !== null) {
            const record = data;
            this.extractValuesRecursive(record[key], path, index + 1, results);
        }
    }
    matchesPattern(value, patterns, relation) {
        for (const pattern of patterns) {
            switch (relation) {
                case "contains":
                    if (value.includes(pattern))
                        return true;
                    break;
                case "equals":
                    if (value === pattern)
                        return true;
                    break;
                case "startsWith":
                    if (value.startsWith(pattern))
                        return true;
                    break;
            }
        }
        return false;
    }
    toJSON() {
        return {
            uri: this._uri,
            did: this._did,
            status: this._status,
            matches: this._matches.map((m) => ({
                provider: m.provider.id,
                isAmbiguous: m.isAmbiguous,
            })),
            errors: this._errors,
        };
    }
    static fromJSON(data) {
        return new Claim(data.uri, data.did);
    }
}
//# sourceMappingURL=claim.js.map