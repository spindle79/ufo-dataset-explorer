/**
 * Audio File Data Access Layer
 *
 * Manages storage and retrieval of audio files and their metadata.
 * Uses Supabase Storage buckets for file storage and original_uploads table for metadata.
 */

import { AudioFile, AudioFileCreate, AudioFileUpdate } from "./audio-types";
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
 * Convert original_uploads record to AudioFile
 * Handles type-specific status derivation based on transcript presence
 */
function uploadRecordToAudioFile(record: UploadRecord): AudioFile {
  // Determine status based on actual file state
  // If file has a transcript, it's been parsed, regardless of stored status
  const hasTranscript = !!record.metadata?.currentTranscriptId;

  // Derive status: if it has a transcript, it's parsed; otherwise use stored status
  // But preserve "discovered" status (file not yet fetched)
  let derivedStatus: AudioFile["status"];
  if (hasTranscript) {
    derivedStatus = "parsed";
  } else if (record.status === "discovered") {
    // Keep "discovered" status for files found but not yet fetched
    derivedStatus = "discovered";
  } else {
    // For manually uploaded files or files that have been fetched but not processed
    // Use the stored status, defaulting to "pending"
    derivedStatus = (record.status as AudioFile["status"]) || "pending";
  }

  const audioFile: AudioFile = {
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
    audioFile.currentTranscriptId = record.metadata.currentTranscriptId;
  }

  // Attach full metadata object for access to excluded flag and other metadata
  (audioFile as any).metadata = record.metadata || {};

  return audioFile;
}

/**
 * File access configuration for audio files
 */
const audioFileConfig: FileAccessConfig<AudioFile> = {
  datasetType: "audio",
  recordToFile: uploadRecordToAudioFile,
  getBucket: () => STORAGE_BUCKETS.AUDIO_FILES,
  metadataIdField: "audioFileId", // For backwards compatibility
};

/**
 * Check if an audio file with the same name and size already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicateAudioFile(
  fileName: string,
  fileSize: number
): Promise<AudioFile | null> {
  return findDuplicateFile(audioFileConfig, fileName, fileSize);
}

/**
 * Check if an audio file with the same canonical URL or original URL already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicateAudioFileByUrl(
  canonicalUrl: string,
  originalUrl?: string
): Promise<AudioFile | null> {
  return findDuplicateFileByUrl(audioFileConfig, canonicalUrl, originalUrl);
}

/**
 * Create a new audio file record
 */
export async function createAudioFile(
  data: AudioFileCreate,
  fileBuffer?: Buffer,
  mimeType?: string
): Promise<AudioFile> {
  if (!fileBuffer) {
    throw new Error("File buffer is required");
  }

  return createFile(audioFileConfig, data, fileBuffer, mimeType);
}

/**
 * Create an audio file record from URL without downloading the file
 */
export async function createAudioFileFromUrl(
  data: AudioFileCreate
): Promise<AudioFile> {
  return createFileFromUrl(audioFileConfig, data);
}

/**
 * Get audio file by ID
 */
export async function getAudioFileById(id: string): Promise<AudioFile | null> {
  return getFileById(audioFileConfig, id);
}

/**
 * Get all audio files
 */
export async function getAllAudioFiles(): Promise<AudioFile[]> {
  return getAllFiles(audioFileConfig);
}

/**
 * Update audio file metadata
 */
export async function updateAudioFile(
  id: string,
  updates: AudioFileUpdate
): Promise<AudioFile | null> {
  const audioFile = await getAudioFileById(id);
  if (!audioFile) {
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
        .eq("dataset_type", "audio")
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
        .eq("dataset_type", "audio")
        .select()
        .single();

      if (error || !updatedRecord) {
        console.error("Error updating audio file:", error);
        return null;
      }

      return uploadRecordToAudioFile(updatedRecord);
    } catch (error) {
      console.error("Error updating audio file:", error);
      return null;
    }
  }

  // Use base update function for standard fields
  return updateFile(audioFileConfig, id, updates, audioFile);
}

/**
 * Delete audio file
 */
export async function deleteAudioFile(id: string): Promise<boolean> {
  const audioFile = await getAudioFileById(id);
  if (!audioFile) {
    return false;
  }

  return deleteFile(audioFileConfig, id, audioFile);
}

/**
 * Get audio file buffer for serving
 */
export async function getAudioFileBuffer(id: string): Promise<Buffer | null> {
  const audioFile = await getAudioFileById(id);
  if (!audioFile) {
    return null;
  }

  return getFileBuffer(audioFileConfig, id, audioFile);
}
