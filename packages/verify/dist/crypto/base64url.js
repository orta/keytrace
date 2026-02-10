/**
 * Base64url decode a string to UTF-8 text.
 */
export function base64urlDecode(str) {
    const bytes = base64urlDecodeToBytes(str);
    return new TextDecoder().decode(bytes);
}
/**
 * Base64url decode a string to raw bytes.
 */
export function base64urlDecodeToBytes(str) {
    // Add padding if needed
    let padded = str;
    const remainder = str.length % 4;
    if (remainder === 2)
        padded += "==";
    else if (remainder === 3)
        padded += "=";
    // Convert URL-safe characters back to standard base64
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    // Decode - works in both browser and Node.js
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
//# sourceMappingURL=base64url.js.map