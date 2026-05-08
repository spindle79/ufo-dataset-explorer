/**
 * Shared file operations for viewer components
 * Provides reusable functions for include, exclude, delete, and date formatting
 */

export type FileType = "image" | "video" | "audio" | "pdf";

/**
 * Format a date string to a localized date/time string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Include a file in the table view
 */
export async function includeFile(
  fileId: string,
  fileType: FileType,
  onSuccess: () => Promise<void>,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`/api/${fileType}/${fileId}/include`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to include file");
    }

    await onSuccess();
  } catch (err) {
    onError(
      err instanceof Error ? err.message : "Failed to include file"
    );
  }
}

/**
 * Exclude a file from the table view
 */
export async function excludeFile(
  fileId: string,
  fileType: FileType,
  onSuccess: () => Promise<void>,
  onError: (error: string) => void,
  onComplete?: () => void
): Promise<void> {
  try {
    const response = await fetch(`/api/${fileType}/${fileId}/exclude`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to exclude file");
    }

    await onSuccess();
    onComplete?.();
  } catch (err) {
    onError(
      err instanceof Error ? err.message : "Failed to exclude file"
    );
    onComplete?.();
  }
}

/**
 * Delete a file
 */
export async function deleteFile(
  fileId: string,
  fileType: FileType,
  onSuccess: () => Promise<void>,
  onError: (error: string) => void,
  onComplete?: () => void
): Promise<void> {
  try {
    const response = await fetch(`/api/${fileType}/${fileId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to delete ${fileType} file`);
    }

    await onSuccess();
    onComplete?.();
  } catch (err) {
    onError(
      err instanceof Error
        ? err.message
        : `Failed to delete ${fileType} file`
    );
    onComplete?.();
  }
}

/**
 * Process a file (download from source)
 */
export async function processFile(
  fileId: string,
  fileType: FileType,
  originalUrl: string,
  onSuccess: () => Promise<void>,
  onError: (error: string) => void,
  onComplete?: () => void
): Promise<void> {
  if (!originalUrl) {
    onError(`No URL available to process this ${fileType}`);
    return;
  }

  try {
    const response = await fetch(`/api/${fileType}/${fileId}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: originalUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to process ${fileType}`
      );
    }

    await onSuccess();
    onComplete?.();
  } catch (err) {
    onError(
      err instanceof Error
        ? err.message
        : `Failed to process ${fileType}`
    );
    onComplete?.();
  }
}

