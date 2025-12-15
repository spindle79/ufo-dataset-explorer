/**
 * Utility functions
 */

/**
 * Decode URL-encoded file names for display
 * Handles cases where file names are URL-encoded (e.g., "file%20name.mp3" -> "file name.mp3")
 */
export function decodeFileName(fileName: string): string {
  try {
    return decodeURIComponent(fileName);
  } catch {
    // If decoding fails, return the original name
    return fileName;
  }
}

