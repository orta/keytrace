/**
 * Canonicalize an object for signing: sort keys recursively and JSON.stringify.
 * This ensures the same data always produces the same bytes for signing.
 */
export declare function canonicalize(data: Record<string, unknown>): string;
//# sourceMappingURL=canonicalize.d.ts.map