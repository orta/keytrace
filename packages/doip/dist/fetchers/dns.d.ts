export interface DnsFetchResult {
    domain: string;
    records: {
        txt: string[];
    };
}
export interface DnsFetchOptions {
    timeout?: number;
}
/**
 * Fetch DNS TXT records for a domain.
 * Returns null in environments where DNS resolution is not available.
 */
export declare function fetch(domain: string, options?: DnsFetchOptions): Promise<DnsFetchResult | null>;
//# sourceMappingURL=dns.d.ts.map