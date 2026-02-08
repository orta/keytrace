export interface HttpFetchOptions {
    format: "json" | "text";
    headers?: Record<string, string>;
    timeout?: number;
}
/**
 * Fetch data from an HTTP/HTTPS URL
 */
export declare function fetch(url: string, options: HttpFetchOptions): Promise<unknown>;
//# sourceMappingURL=http.d.ts.map