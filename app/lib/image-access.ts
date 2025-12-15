/**
 * Image File Data Access Layer
 *
 * Manages storage and retrieval of image files and their metadata.
 * Uses Supabase Storage buckets for file storage and original_uploads table for metadata.
 */

import { ImageFile, ImageFileCreate, ImageFileUpdate } from "./image-types";
import {
  createFile,
  createFileFromUrl,
  getFileById,
  getAllFiles,
  updateFile,
  deleteFile,
  findDuplicateFile,
  findDuplicateFileByUrl,
  getFileBuffer,
  type FileAccessConfig,
} from "./file-access-base";
import type { UploadRecord } from "./file-base";
import { getBucketForDatasetType } from "./supabase-storage";
import { createAdminClient } from "./supabase/server";
import type { OriginalUploadUpdate } from "./supabase-types";

/**
 * Convert original_uploads record to ImageFile
 */
function uploadRecordToImageFile(record: UploadRecord): ImageFile {
  const imageFile: ImageFile = {
    id: record.id,
    fileName: record.file_name,
    originalUrl: record.original_url,
    uploadedDate: record.uploaded_at,
    description: record.metadata?.description || "",
    categories: record.metadata?.categories || [],
    filePath: record.file_path,
    fileSize: record.file_size || undefined,
    mimeType: record.mime_type || undefined,
    status: (record.status as ImageFile["status"]) || "pending",
  };

  // Attach full metadata object for access to excluded flag, currentDescriptionId, and other metadata
  (imageFile as any).metadata = record.metadata || {};
  (imageFile as any).currentDescriptionId =
    record.metadata?.currentDescriptionId || null;

  return imageFile;
}

/**
 * File access configuration for image files
 */
const imageFileConfig: FileAccessConfig<ImageFile> = {
  datasetType: "image",
  recordToFile: uploadRecordToImageFile,
  getBucket: () => getBucketForDatasetType("image"),
};

/**
 * Check if an image file with the same name and size already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicateImageFile(
  fileName: string,
  fileSize: number
): Promise<ImageFile | null> {
  return findDuplicateFile(imageFileConfig, fileName, fileSize);
}

/**
 * Check if an image file with the same canonical URL or original URL already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicateImageFileByUrl(
  canonicalUrl: string,
  originalUrl?: string
): Promise<ImageFile | null> {
  return findDuplicateFileByUrl(imageFileConfig, canonicalUrl, originalUrl);
}

/**
 * Create a new image file record
 */
export async function createImageFile(
  data: ImageFileCreate,
  fileBuffer?: Buffer,
  mimeType?: string
): Promise<ImageFile> {
  if (!fileBuffer) {
    throw new Error("File buffer is required");
  }

  return createFile(imageFileConfig, data, fileBuffer, mimeType);
}

/**
 * Create an image file record from URL without downloading the file
 */
export async function createImageFileFromUrl(
  data: ImageFileCreate
): Promise<ImageFile> {
  return createFileFromUrl(imageFileConfig, data);
}

/**
 * Get image file by ID
 */
export async function getImageFileById(id: string): Promise<ImageFile | null> {
  return getFileById(imageFileConfig, id);
}

/**
 * Get all image files
 */
export async function getAllImageFiles(): Promise<ImageFile[]> {
  return getAllFiles(imageFileConfig);
}

/**
 * Update image file metadata
 */
export async function updateImageFile(
  id: string,
  updates: ImageFileUpdate & { currentDescriptionId?: string | null }
): Promise<ImageFile | null> {
  const imageFile = await getImageFileById(id);
  if (!imageFile) {
    return null;
  }

  // Handle currentDescriptionId in metadata if provided
  if (updates.currentDescriptionId !== undefined) {
    try {
      const supabase = createAdminClient();

      // Get existing metadata to preserve all fields
      const { data: existingRecord } = await supabase
        .from("original_uploads")
        .select("metadata")
        .eq("id", id)
        .eq("dataset_type", "image")
        .single();

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
        currentDescriptionId: updates.currentDescriptionId,
      };

      const updateData: OriginalUploadUpdate = {
        metadata: newMetadata,
      };

      if (updates.fileName !== undefined) {
        updateData.file_name = updates.fileName;
      }

      const { data: updatedRecord, error } = await supabase
        .from("original_uploads")
        .update(updateData)
        .eq("id", id)
        .eq("dataset_type", "image")
        .select()
        .single();

      if (error || !updatedRecord) {
        console.error("Error updating image file:", error);
        return null;
      }

      return uploadRecordToImageFile(updatedRecord);
    } catch (error) {
      console.error("Error updating image file:", error);
      return null;
    }
  }

  // Use base update function for standard fields
  return updateFile(imageFileConfig, id, updates, imageFile);
}

/**
 * Delete image file
 */
export async function deleteImageFile(id: string): Promise<boolean> {
  const imageFile = await getImageFileById(id);
  if (!imageFile) {
    return false;
  }

  return deleteFile(imageFileConfig, id, imageFile);
}

/**
 * Get image file buffer for serving
 */
export async function getImageFileBuffer(id: string): Promise<Buffer | null> {
  const imageFile = await getImageFileById(id);
  if (!imageFile) {
    return null;
  }

  return getFileBuffer(imageFileConfig, id, imageFile);
}
