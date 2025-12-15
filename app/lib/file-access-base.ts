/**
 * Base File Access Layer
 *
 * Generic CRUD operations for all file types.
 * Provides shared functionality while allowing type-specific customization.
 */

import { randomUUID } from "crypto";
import type {
  BaseFile,
  BaseFileCreate,
  BaseFileUpdate,
  UploadRecord,
} from "./file-base";
import {
  uploadFileForDataset,
  downloadFile,
  deleteFile as deleteStorageFile,
  getBucketForDatasetType,
} from "./supabase-storage";
import { createAdminClient } from "./supabase/server";
import type {
  DatasetType,
  OriginalUploadCreate,
  OriginalUploadUpdate,
} from "./supabase-types";
import { getCanonicalUrl } from "./url-utils";
import { getStoragePath } from "./file-base";

/**
 * Configuration for file access operations
 */
export interface FileAccessConfig<T extends BaseFile> {
  datasetType: DatasetType;
  /**
   * Convert a database record to the file type
   * This allows type-specific status derivation and metadata handling
   */
  recordToFile: (record: UploadRecord) => T;
  /**
   * Get the storage bucket for this file type
   */
  getBucket: () => string;
  /**
   * Optional: Get metadata field name for backwards compatibility lookup
   * e.g., "audioFileId" for audio files
   */
  metadataIdField?: string;
}

/**
 * Create a new file record
 */
export async function createFile<T extends BaseFile>(
  config: FileAccessConfig<T>,
  data: BaseFileCreate,
  fileBuffer: Buffer,
  mimeType?: string
): Promise<T> {
  const supabase = createAdminClient();
  const fileName = data.fileName || "untitled";

  // Generate UUID for the record
  const id = randomUUID();
  const storagePath = getStoragePath(config.datasetType, id, fileName);

  // Upload file to Supabase Storage
  let fileSize: number;
  let actualStoragePath: string;
  try {
    const result = await uploadFileForDataset(
      config.datasetType,
      id,
      fileName,
      fileBuffer,
      {
        contentType: mimeType,
        useAdmin: true,
      }
    );
    fileSize = fileBuffer.length;
    actualStoragePath = result.path;
  } catch (error) {
    console.error(
      `Failed to upload ${config.datasetType} file to storage:`,
      error
    );
    throw new Error(
      `Failed to upload ${config.datasetType} file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  // Create record in original_uploads table
  const uploadRecord: OriginalUploadCreate = {
    file_name: fileName,
    file_path: actualStoragePath,
    file_size: fileSize,
    mime_type: mimeType || null,
    dataset_type: config.datasetType,
    upload_method: data.originalUrl ? "url_fetch" : "upload",
    original_url: data.originalUrl || null,
    canonical_url: data.originalUrl ? getCanonicalUrl(data.originalUrl) : null,
    status: "pending",
    metadata: {
      description: data.description || "",
      categories: data.categories || [],
    },
  };

  // Insert with explicit ID
  const { data: insertedRecord, error: insertError } = await supabase
    .from("original_uploads")
    .insert({ ...uploadRecord, id })
    .select()
    .single();

  if (insertError || !insertedRecord) {
    // Try to delete the uploaded file if database insert fails
    try {
      await deleteStorageFile(config.getBucket(), actualStoragePath, true);
    } catch (deleteError) {
      console.error(
        "Failed to delete uploaded file after DB error:",
        deleteError
      );
    }
    throw new Error(
      `Failed to create original_uploads record: ${
        insertError?.message || "Unknown error"
      }`
    );
  }

  return config.recordToFile(insertedRecord);
}

/**
 * Get file by ID
 */
export async function getFileById<T extends BaseFile>(
  config: FileAccessConfig<T>,
  id: string
): Promise<T | null> {
  try {
    const supabase = createAdminClient();

    // Try to find by ID directly
    const { data: uploadRecord, error } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("id", id)
      .eq("dataset_type", config.datasetType)
      .single();

    if (error || !uploadRecord) {
      // Also try to find by metadata ID field (for backwards compatibility)
      if (config.metadataIdField) {
        const { data: uploadRecordByMetadata, error: metadataError } =
          await supabase
            .from("original_uploads")
            .select("*")
            .eq("dataset_type", config.datasetType)
            .eq(`metadata->>${config.metadataIdField}`, id)
            .single();

        if (metadataError || !uploadRecordByMetadata) {
          return null;
        }

        return config.recordToFile(uploadRecordByMetadata);
      }

      return null;
    }

    return config.recordToFile(uploadRecord);
  } catch (error) {
    console.error(
      `Error fetching ${config.datasetType} file from database:`,
      error
    );
    return null;
  }
}

/**
 * Get all files of a type
 */
export async function getAllFiles<T extends BaseFile>(
  config: FileAccessConfig<T>
): Promise<T[]> {
  try {
    const supabase = createAdminClient();

    const { data: uploadRecords, error } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("dataset_type", config.datasetType)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error(
        `Error fetching ${config.datasetType} files from database:`,
        error
      );
      return [];
    }

    if (!uploadRecords) {
      return [];
    }

    return uploadRecords.map(config.recordToFile);
  } catch (error) {
    console.error(`Error fetching all ${config.datasetType} files:`, error);
    return [];
  }
}

/**
 * Update file metadata
 */
export async function updateFile<T extends BaseFile>(
  config: FileAccessConfig<T>,
  id: string,
  updates: BaseFileUpdate,
  currentFile: T
): Promise<T | null> {
  try {
    const supabase = createAdminClient();

    // Build update object
    const updateData: OriginalUploadUpdate = {};

    if (updates.fileName !== undefined) {
      updateData.file_name = updates.fileName;
    }

    // Get existing metadata from database to preserve all fields
    const { data: existingRecord } = await supabase
      .from("original_uploads")
      .select("metadata")
      .eq("id", id)
      .eq("dataset_type", config.datasetType)
      .single();

    // Preserve existing metadata and only update specified fields
    const existingMetadata =
      (existingRecord?.metadata as Record<string, any>) || {};
    const newMetadata: Record<string, any> = {
      ...existingMetadata, // Preserve all existing metadata fields
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
      ...(updates.categories !== undefined && {
        categories: updates.categories,
      }),
    };

    updateData.metadata = newMetadata;

    const { data: updatedRecord, error } = await supabase
      .from("original_uploads")
      .update(updateData)
      .eq("id", id)
      .eq("dataset_type", config.datasetType)
      .select()
      .single();

    if (error || !updatedRecord) {
      console.error(`Error updating ${config.datasetType} file:`, error);
      return null;
    }

    return config.recordToFile(updatedRecord);
  } catch (error) {
    console.error(`Error updating ${config.datasetType} file:`, error);
    return null;
  }
}

/**
 * Delete file
 */
export async function deleteFile<T extends BaseFile>(
  config: FileAccessConfig<T>,
  id: string,
  file: T
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // Delete file from Supabase Storage
    try {
      await deleteStorageFile(config.getBucket(), file.filePath, true);
    } catch (error) {
      // File might not exist in storage, that's okay
      console.warn(
        `Failed to delete ${config.datasetType} file from storage: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Delete record from database
    const { error: deleteError } = await supabase
      .from("original_uploads")
      .delete()
      .eq("id", id)
      .eq("dataset_type", config.datasetType);

    if (deleteError) {
      console.error(
        `Error deleting ${config.datasetType} file from database:`,
        deleteError
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error deleting ${config.datasetType} file:`, error);
    return false;
  }
}

/**
 * Check if a file with the same name and size already exists
 */
export async function findDuplicateFile<T extends BaseFile>(
  config: FileAccessConfig<T>,
  fileName: string,
  fileSize: number
): Promise<T | null> {
  try {
    const supabase = createAdminClient();

    const { data: existingRecord, error } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("dataset_type", config.datasetType)
      .eq("file_name", fileName)
      .eq("file_size", fileSize)
      .maybeSingle();

    if (error) {
      console.error(
        `Error checking for duplicate ${config.datasetType} file:`,
        error
      );
      return null;
    }

    if (!existingRecord) {
      return null;
    }

    return config.recordToFile(existingRecord);
  } catch (error) {
    console.error(`Error finding duplicate ${config.datasetType} file:`, error);
    return null;
  }
}

/**
 * Check if a file with the same canonical URL or original URL already exists
 */
export async function findDuplicateFileByUrl<T extends BaseFile>(
  config: FileAccessConfig<T>,
  canonicalUrl: string,
  originalUrl?: string
): Promise<T | null> {
  try {
    const supabase = createAdminClient();

    // First try to find by canonical_url (most reliable)
    let { data: existingRecord, error } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("dataset_type", config.datasetType)
      .eq("canonical_url", canonicalUrl)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        `Error checking for duplicate ${config.datasetType} file by URL:`,
        error
      );
      return null;
    }

    // If not found by canonical_url and we have originalUrl, try by original_url as fallback
    if (!existingRecord && originalUrl) {
      const { data: existingByOriginal, error: originalError } = await supabase
        .from("original_uploads")
        .select("*")
        .eq("dataset_type", config.datasetType)
        .eq("original_url", originalUrl)
        .limit(1)
        .maybeSingle();

      if (originalError) {
        console.error(
          `Error checking for duplicate ${config.datasetType} file by original URL:`,
          originalError
        );
        return null;
      }

      existingRecord = existingByOriginal;
    }

    if (!existingRecord) {
      return null;
    }

    return config.recordToFile(existingRecord);
  } catch (error) {
    console.error(
      `Error finding duplicate ${config.datasetType} file by URL:`,
      error
    );
    return null;
  }
}

/**
 * Create a file record from URL without downloading the file
 * Creates a record with status "pending" and placeholder file path
 */
export async function createFileFromUrl<T extends BaseFile>(
  config: FileAccessConfig<T>,
  data: BaseFileCreate
): Promise<T> {
  const supabase = createAdminClient();

  if (!data.originalUrl) {
    throw new Error("originalUrl is required for URL-only file creation");
  }

  const fileName = data.fileName || "untitled";
  const canonicalUrl = getCanonicalUrl(data.originalUrl);

  // Generate UUID for the record
  const id = randomUUID();

  // Use placeholder file path (similar to discovered files)
  const placeholderPath = `discovered/${config.datasetType}/${canonicalUrl}`;

  // Create record in original_uploads table without uploading file
  const uploadRecord: OriginalUploadCreate = {
    file_name: fileName,
    file_path: placeholderPath,
    file_size: null, // No file size since file isn't downloaded
    mime_type: null, // MIME type unknown until file is fetched
    dataset_type: config.datasetType,
    upload_method: "url_fetch", // Same as downloaded URL files
    original_url: data.originalUrl,
    canonical_url: canonicalUrl,
    status: "pending", // Use "pending" to distinguish from "discovered" (scraped files)
    metadata: {
      description: data.description || "",
      categories: data.categories || [],
    },
  };

  // Insert with explicit ID
  const { data: insertedRecord, error: insertError } = await supabase
    .from("original_uploads")
    .insert({ ...uploadRecord, id })
    .select()
    .single();

  if (insertError || !insertedRecord) {
    throw new Error(
      `Failed to create original_uploads record: ${
        insertError?.message || "Unknown error"
      }`
    );
  }

  return config.recordToFile(insertedRecord);
}

/**
 * Get file buffer for serving
 */
export async function getFileBuffer<T extends BaseFile>(
  config: FileAccessConfig<T>,
  id: string,
  file: T
): Promise<Buffer | null> {
  try {
    // Download file from Supabase Storage
    const blob = await downloadFile(config.getBucket(), file.filePath, true);
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(
      `Failed to download ${config.datasetType} file from storage:`,
      error
    );
    return null;
  }
}
