/**
 * Supabase Storage Utility Functions
 *
 * Provides utilities for uploading, retrieving, and managing files
 * in Supabase Storage buckets.
 */

import { createAdminClient } from "./supabase/server";
import { createClient as createServerClient } from "./supabase/server";
import type { DatasetType } from "./supabase-types";

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  ORIGINAL_UPLOADS: "original-uploads",
  NUFORC_FILES: "nuforc-files",
  UDB_FILES: "udb-files",
  AUDIO_FILES: "audio-files",
  VIDEO_FILES: "video-files",
  PDF_FILES: "pdf-files",
  SCRAPED_PAGES: "scraped-pages",
} as const;

/**
 * Get the appropriate bucket name for a dataset type
 */
export function getBucketForDatasetType(datasetType: DatasetType): string {
  switch (datasetType) {
    case "nuforc":
      return STORAGE_BUCKETS.NUFORC_FILES;
    case "udb":
      return STORAGE_BUCKETS.UDB_FILES;
    case "audio":
      return STORAGE_BUCKETS.AUDIO_FILES;
    case "video":
      return STORAGE_BUCKETS.VIDEO_FILES;
    case "pdf":
      return STORAGE_BUCKETS.PDF_FILES;
    default:
      return STORAGE_BUCKETS.ORIGINAL_UPLOADS;
  }
}

/**
 * Generate a file path for storage
 * Format: {dataset_type}/{upload_id}/{original_filename}
 */
export function generateStoragePath(
  datasetType: DatasetType,
  uploadId: string,
  fileName: string
): string {
  // Sanitize filename for storage
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${datasetType}/${uploadId}/${sanitizedFileName}`;
}

/**
 * Upload a file to Supabase Storage
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket (e.g., 'nuforc/upload-id/file.csv')
 * @param file - File buffer or Blob
 * @param options - Upload options
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: Buffer | Blob | File,
  options?: {
    contentType?: string;
    upsert?: boolean;
    useAdmin?: boolean;
  }
): Promise<{ path: string; url: string }> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createServerClient();

  // Convert File to Blob if needed
  let fileBlob: Blob;
  if (file instanceof File) {
    fileBlob = file;
  } else if (Buffer.isBuffer(file)) {
    // Convert Buffer to ArrayBuffer for Blob constructor
    // TypeScript has issues with Buffer.buffer (can be SharedArrayBuffer)
    // So we manually copy the data to a new Uint8Array
    const bufferData = new Uint8Array(file.length);
    for (let i = 0; i < file.length; i++) {
      bufferData[i] = file[i]!;
    }
    fileBlob = new Blob([bufferData]);
  } else {
    // file is already a Blob (narrowed from Buffer | Blob | File)
    const blobFile: Blob = file;
    fileBlob = blobFile;
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBlob, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });

  if (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to upload file to bucket "${bucketName}" at path "${filePath}": ${errorMessage}`
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Upload a file with automatic bucket selection based on dataset type
 *
 * @param datasetType - Type of dataset
 * @param uploadId - Unique upload identifier
 * @param fileName - Original filename
 * @param file - File buffer or Blob
 * @param options - Upload options
 * @returns Storage path and public URL
 */
export async function uploadFileForDataset(
  datasetType: DatasetType,
  uploadId: string,
  fileName: string,
  file: Buffer | Blob | File,
  options?: {
    contentType?: string;
    upsert?: boolean;
    useAdmin?: boolean;
  }
): Promise<{ path: string; url: string; bucket: string }> {
  const bucket = getBucketForDatasetType(datasetType);
  const filePath = generateStoragePath(datasetType, uploadId, fileName);

  const result = await uploadFile(bucket, filePath, file, options);

  return {
    ...result,
    bucket,
  };
}

/**
 * Get a public URL for a file in storage
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket
 * @returns Public URL
 */
export async function getPublicUrl(
  bucketName: string,
  filePath: string
): Promise<string> {
  const supabase = await createServerClient();
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Get a signed URL for a file (temporary access)
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param useAdmin - Whether to use admin client
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600,
  useAdmin: boolean = false
): Promise<string> {
  const supabase = useAdmin ? createAdminClient() : await createServerClient();

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to create signed URL for bucket "${bucketName}" at path "${filePath}": ${errorMessage}`
    );
  }

  return data.signedUrl;
}

/**
 * Safely extract error message from Supabase error object
 */
function getErrorMessage(error: any): string {
  if (typeof error?.message === "string") {
    return error.message;
  }
  if (error?.message && typeof error.message === "object") {
    return JSON.stringify(error.message);
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }
  return "Unknown error";
}

/**
 * Download a file from storage
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket
 * @param useAdmin - Whether to use admin client
 * @returns File data as Blob
 */
export async function downloadFile(
  bucketName: string,
  filePath: string,
  useAdmin: boolean = false
): Promise<Blob> {
  const supabase = useAdmin ? createAdminClient() : await createServerClient();

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(filePath);

  if (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to download file from bucket "${bucketName}" at path "${filePath}": ${errorMessage}`
    );
  }

  return data;
}

/**
 * Delete a file from storage
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket
 * @param useAdmin - Whether to use admin client
 */
export async function deleteFile(
  bucketName: string,
  filePath: string,
  useAdmin: boolean = true
): Promise<void> {
  const supabase = useAdmin ? createAdminClient() : await createServerClient();

  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to delete file from bucket "${bucketName}" at path "${filePath}": ${errorMessage}`
    );
  }
}

/**
 * List files in a storage bucket
 *
 * @param bucketName - Name of the storage bucket
 * @param folderPath - Optional folder path to list
 * @param useAdmin - Whether to use admin client
 * @returns List of file objects
 */
export async function listFiles(
  bucketName: string,
  folderPath?: string,
  useAdmin: boolean = false
): Promise<
  Array<{
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: Record<string, any>;
  }>
> {
  const supabase = useAdmin ? createAdminClient() : await createServerClient();

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folderPath);

  if (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to list files in bucket "${bucketName}"${folderPath ? ` at path "${folderPath}"` : ""}: ${errorMessage}`
    );
  }

  return data || [];
}

/**
 * Check if a file exists in storage
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket
 * @param useAdmin - Whether to use admin client
 * @returns True if file exists
 */
export async function fileExists(
  bucketName: string,
  filePath: string,
  useAdmin: boolean = false
): Promise<boolean> {
  try {
    const supabase = useAdmin
      ? createAdminClient()
      : await createServerClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(filePath.split("/").slice(0, -1).join("/"));

    if (error) {
      return false;
    }

    const fileName = filePath.split("/").pop();
    return data?.some((file) => file.name === fileName) ?? false;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 *
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket
 * @param useAdmin - Whether to use admin client
 * @returns File metadata
 */
export async function getFileMetadata(
  bucketName: string,
  filePath: string,
  useAdmin: boolean = false
): Promise<{
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
} | null> {
  const supabase = useAdmin ? createAdminClient() : await createServerClient();

  const folderPath = filePath.split("/").slice(0, -1).join("/");
  const fileName = filePath.split("/").pop()!;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folderPath || "");

  if (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to get file metadata from bucket "${bucketName}" at path "${filePath}": ${errorMessage}`
    );
  }

  const file = data?.find((f) => f.name === fileName);
  return file || null;
}
