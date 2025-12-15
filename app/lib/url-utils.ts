/**
 * URL normalization utilities
 * Used for efficient URL lookups by storing canonical URLs in the database
 */

/**
 * Get canonical URL string for comparison
 * Normalizes encoding, removes fragments, and standardizes format
 * This ensures URLs with %20 and spaces are treated identically
 */
export function getCanonicalUrl(url: string): string {
  try {
    // First, try to decode the URL string to handle %20 -> space
    // This ensures both encoded and unencoded URLs normalize the same way
    let decodedUrl = url;
    try {
      // decodeURIComponent handles %20, %2F, etc.
      decodedUrl = decodeURIComponent(url);
    } catch {
      // If decoding fails, use original URL
      decodedUrl = url;
    }

    // Now parse as URL (this will re-encode if needed, but pathname will be consistent)
    const urlObj = new URL(decodedUrl);
    // Remove fragment
    urlObj.hash = "";

    // Normalize pathname: decode any remaining encoding and remove trailing slash
    // The pathname property is already decoded by URL constructor
    let normalizedPath = urlObj.pathname;
    // Remove trailing slash for consistency
    normalizedPath = normalizedPath.replace(/\/$/, "");

    // Reconstruct canonical URL with normalized components
    // Use lowercase for protocol and host to ensure case-insensitive matching
    const canonical = `${urlObj.protocol.toLowerCase()}//${urlObj.host.toLowerCase()}${normalizedPath}${
      urlObj.search
    }`;

    return canonical;
  } catch (parseError) {
    // If URL parsing fails, try manual normalization
    try {
      // Remove hash/fragment
      const hashIndex = url.indexOf("#");
      const withoutHash = hashIndex !== -1 ? url.substring(0, hashIndex) : url;

      // Try to decode
      let decoded = withoutHash;
      try {
        decoded = decodeURIComponent(withoutHash);
      } catch {
        decoded = withoutHash;
      }

      // Remove trailing slash
      return decoded.replace(/\/$/, "");
    } catch {
      // Last resort: just remove hash and trailing slash
      const hashIndex = url.indexOf("#");
      const withoutHash = hashIndex !== -1 ? url.substring(0, hashIndex) : url;
      return withoutHash.replace(/\/$/, "");
    }
  }
}
