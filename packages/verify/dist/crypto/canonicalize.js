/**
 * Canonicalize an object for signing: sort keys recursively and JSON.stringify.
 * This ensures the same data always produces the same bytes for signing.
 */
export function canonicalize(data) {
    return JSON.stringify(sortKeys(data));
}
function sortKeys(obj) {
    if (obj === null || typeof obj !== "object")
        return obj;
    if (Array.isArray(obj))
        return obj.map(sortKeys);
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
        sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
}
//# sourceMappingURL=canonicalize.js.map