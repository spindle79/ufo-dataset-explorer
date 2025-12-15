/**
 * Video File Data Access Layer
 *
 * Manages storage and retrieval of video files and their metadata.
 * Uses Supabase Storage buckets for file storage and original_uploads table for metadata.
 */

import { VideoFile, VideoFileCreate, VideoFileUpdate } from "./video-types";
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
import { STORAGE_BUCKETS } from "./supabase-storage";
import { createAdminClient } from "./supabase/server";
import type { OriginalUploadUpdate } from "./supabase-types";

/**
 * Convert original_uploads record to VideoFile
 * Handles type-specific status derivation based on transcript presence
 */
function uploadRecordToVideoFile(record: UploadRecord): VideoFile {
  // Determine status based on actual file state
  // If file has a transcript, it's been parsed, regardless of stored status
  const hasTranscript = !!record.metadata?.currentTranscriptId;

  // Derive status: if it has a transcript, it's parsed; otherwise use stored status
  // But preserve "discovered" status (file not yet fetched)
  let derivedStatus: VideoFile["status"];
  if (hasTranscript) {
    derivedStatus = "parsed";
  } else if (record.status === "discovered") {
    // Keep "discovered" status for files found but not yet fetched
    derivedStatus = "discovered";
  } else {
    // For manually uploaded files or files that have been fetched but not processed
    // Use the stored status, defaulting to "pending"
    derivedStatus = (record.status as VideoFile["status"]) || "pending";
  }

  const videoFile: VideoFile = {
    id: record.id,
    fileName: record.file_name,
    originalUrl: record.original_url,
    uploadedDate: record.uploaded_at,
    description: record.metadata?.description || "",
    categories: record.metadata?.categories || [],
    filePath: record.file_path,
    fileSize: record.file_size || undefined,
    mimeType: record.mime_type || undefined,
    status: derivedStatus,
  };

  // Add currentTranscriptId if it exists in metadata
  if (record.metadata?.currentTranscriptId !== undefined) {
    videoFile.currentTranscriptId = record.metadata.currentTranscriptId;
  }

  // Attach full metadata object for access to excluded flag and other metadata
  (videoFile as any).metadata = record.metadata || {};

  return videoFile;
}

/**
 * File access configuration for video files
 */
const videoFileConfig: FileAccessConfig<VideoFile> = {
  datasetType: "video",
  recordToFile: uploadRecordToVideoFile,
  getBucket: () => STORAGE_BUCKETS.VIDEO_FILES,
  metadataIdField: "videoFileId", // For backwards compatibility
};

/**
 * Check if a video file with the same name and size already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicateVideoFile(
  fileName: string,
  fileSize: number
): Promise<VideoFile | null> {
  return findDuplicateFile(videoFileConfig, fileName, fileSize);
}

/**
 * Check if a video file with the same canonical URL or original URL already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicateVideoFileByUrl(
  canonicalUrl: string,
  originalUrl?: string
): Promise<VideoFile | null> {
  return findDuplicateFileByUrl(videoFileConfig, canonicalUrl, originalUrl);
}

/**
 * Create a new video file record
 */
export async function createVideoFile(
  data: VideoFileCreate,
  fileBuffer?: Buffer,
  mimeType?: string
): Promise<VideoFile> {
  if (!fileBuffer) {
    throw new Error("File buffer is required");
  }

  return createFile(videoFileConfig, data, fileBuffer, mimeType);
}

/**
 * Create a video file record from URL without downloading the file
 */
export async function createVideoFileFromUrl(
  data: VideoFileCreate
): Promise<VideoFile> {
  return createFileFromUrl(videoFileConfig, data);
}

/**
 * Get video file by ID
 */
export async function getVideoFileById(id: string): Promise<VideoFile | null> {
  return getFileById(videoFileConfig, id);
}

/**
 * Get all video files
 */
export async function getAllVideoFiles(): Promise<VideoFile[]> {
  return getAllFiles(videoFileConfig);
}

/**
 * Update video file metadata
 */
export async function updateVideoFile(
  id: string,
  updates: VideoFileUpdate
): Promise<VideoFile | null> {
  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return null;
  }

  // Handle currentTranscriptId in metadata if provided
  if (updates.currentTranscriptId !== undefined) {
    try {
      const supabase = createAdminClient();

      // Get existing metadata to preserve all fields
      const { data: existingRecord } = await supabase
        .from("original_uploads")
        .select("metadata")
        .eq("id", id)
        .eq("dataset_type", "video")
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
        currentTranscriptId: updates.currentTranscriptId,
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
        .eq("dataset_type", "video")
        .select()
        .single();

      if (error || !updatedRecord) {
        console.error("Error updating video file:", error);
        return null;
      }

      return uploadRecordToVideoFile(updatedRecord);
    } catch (error) {
      console.error("Error updating video file:", error);
      return null;
    }
  }

  // Use base update function for standard fields
  return updateFile(videoFileConfig, id, updates, videoFile);
}

/**
 * Delete video file
 */
export async function deleteVideoFile(id: string): Promise<boolean> {
  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return false;
  }

  return deleteFile(videoFileConfig, id, videoFile);
}

/**
 * Get video file buffer for serving
 */
export async function getVideoFileBuffer(id: string): Promise<Buffer | null> {
  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return null;
  }

  return getFileBuffer(videoFileConfig, id, videoFile);
}
