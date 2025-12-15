/**
 * PDF File Data Access Layer
 *
 * Manages storage and retrieval of PDF files and their metadata.
 * Uses Supabase Storage buckets for file storage and original_uploads table for metadata.
 */

import { PdfFile, PdfFileCreate, PdfFileUpdate } from "./pdf-types";
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
 * Convert original_uploads record to PdfFile
 * Handles type-specific status derivation based on extraction presence
 */
function uploadRecordToPdfFile(record: UploadRecord): PdfFile {
  // Determine status based on actual file state
  // If file has an extraction, it's been parsed, regardless of stored status
  const hasExtraction = !!record.metadata?.currentExtractionId;

  // Derive status: if it has an extraction, it's parsed; otherwise use stored status
  // But preserve "discovered" status (file not yet fetched)
  let derivedStatus: PdfFile["status"];
  if (hasExtraction) {
    derivedStatus = "parsed";
  } else if (record.status === "discovered") {
    // Keep "discovered" status for files found but not yet fetched
    derivedStatus = "discovered";
  } else {
    // For manually uploaded files or files that have been fetched but not processed
    // Use the stored status, defaulting to "pending"
    derivedStatus = (record.status as PdfFile["status"]) || "pending";
  }

  const pdfFile = {
    id: record.id,
    fileName: record.file_name,
    originalUrl: record.original_url,
    uploadedDate: record.uploaded_at,
    description: record.metadata?.description || "",
    categories: record.metadata?.categories || [],
    filePath: record.file_path,
    fileSize: record.file_size || undefined,
    mimeType: record.mime_type || undefined,
    pageCount: record.metadata?.pageCount,
    extractedText: record.metadata?.extractedText,
    currentExtractionId: record.metadata?.currentExtractionId || null,
    status: derivedStatus,
  };

  // Attach full metadata object for access to excluded flag and other metadata
  (pdfFile as any).metadata = record.metadata || {};

  return pdfFile;
}

/**
 * File access configuration for PDF files
 */
const pdfFileConfig: FileAccessConfig<PdfFile> = {
  datasetType: "pdf",
  recordToFile: uploadRecordToPdfFile,
  getBucket: () => STORAGE_BUCKETS.PDF_FILES,
  metadataIdField: "pdfFileId", // For backwards compatibility
};

/**
 * Check if a PDF file with the same name and size already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicatePdfFile(
  fileName: string,
  fileSize: number
): Promise<PdfFile | null> {
  return findDuplicateFile(pdfFileConfig, fileName, fileSize);
}

/**
 * Check if a PDF file with the same canonical URL or original URL already exists
 * Returns the existing file if found, null otherwise
 */
export async function findDuplicatePdfFileByUrl(
  canonicalUrl: string,
  originalUrl?: string
): Promise<PdfFile | null> {
  return findDuplicateFileByUrl(pdfFileConfig, canonicalUrl, originalUrl);
}

/**
 * Create a new PDF file record
 */
export async function createPdfFile(
  data: PdfFileCreate,
  fileBuffer?: Buffer,
  mimeType?: string
): Promise<PdfFile> {
  if (!fileBuffer) {
    throw new Error("File buffer is required");
  }

  return createFile(pdfFileConfig, data, fileBuffer, mimeType);
}

/**
 * Create a PDF file record from URL without downloading the file
 */
export async function createPdfFileFromUrl(
  data: PdfFileCreate
): Promise<PdfFile> {
  return createFileFromUrl(pdfFileConfig, data);
}

/**
 * Get PDF file by ID
 */
export async function getPdfFileById(id: string): Promise<PdfFile | null> {
  return getFileById(pdfFileConfig, id);
}

/**
 * Get all PDF files
 */
export async function getAllPdfFiles(): Promise<PdfFile[]> {
  return getAllFiles(pdfFileConfig);
}

/**
 * Update PDF file metadata
 */
export async function updatePdfFile(
  id: string,
  updates: PdfFileUpdate
): Promise<PdfFile | null> {
  const pdfFile = await getPdfFileById(id);
  if (!pdfFile) {
    return null;
  }

  // Handle currentExtractionId in metadata if provided
  if (updates.currentExtractionId !== undefined) {
    try {
      const supabase = createAdminClient();

      // Get existing metadata to preserve all fields
      const { data: existingRecord } = await supabase
        .from("original_uploads")
        .select("metadata")
        .eq("id", id)
        .eq("dataset_type", "pdf")
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
        currentExtractionId: updates.currentExtractionId,
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
        .eq("dataset_type", "pdf")
        .select()
        .single();

      if (error || !updatedRecord) {
        console.error("Error updating PDF file:", error);
        return null;
      }

      return uploadRecordToPdfFile(updatedRecord);
    } catch (error) {
      console.error("Error updating PDF file:", error);
      return null;
    }
  }

  // Use base update function for standard fields
  return updateFile(pdfFileConfig, id, updates, pdfFile);
}

/**
 * Delete PDF file
 */
export async function deletePdfFile(id: string): Promise<boolean> {
  const pdfFile = await getPdfFileById(id);
  if (!pdfFile) {
    return false;
  }

  return deleteFile(pdfFileConfig, id, pdfFile);
}

/**
 * Get PDF file buffer for serving
 */
export async function getPdfFileBuffer(id: string): Promise<Buffer | null> {
  const pdfFile = await getPdfFileById(id);
  if (!pdfFile) {
    return null;
  }

  return getFileBuffer(pdfFileConfig, id, pdfFile);
}
