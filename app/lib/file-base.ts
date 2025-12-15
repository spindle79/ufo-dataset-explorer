/**
 * Base File Types and Utilities
 *
 * Common interfaces and utilities shared across all file types (audio, video, image, PDF).
 * This provides a foundation for type-safe file handling with minimal code duplication.
 */

import type { DatasetType, UploadStatus } from "./supabase-types";

/**
 * Base file status values
 */
export type FileStatus =
  | "discovered"
  | "pending"
  | "processing"
  | "parsed"
  | "error";

/**
 * Base file interface with all common fields
 * All file types (AudioFile, VideoFile, ImageFile, PdfFile) extend this
 */
export interface BaseFile {
  id: string;
  fileName: string;
  originalUrl: string | null; // null for manually uploaded files
  uploadedDate: string; // ISO date string
  description: string;
  categories: string[];
  filePath: string; // Path to the stored file
  fileSize?: number; // File size in bytes
  mimeType?: string; // MIME type of the file
  status: FileStatus; // Processing status
}

/**
 * Base file creation data
 */
export interface BaseFileCreate {
  fileName: string;
  originalUrl?: string | null;
  description?: string;
  categories?: string[];
}

/**
 * Base file update data
 */
export interface BaseFileUpdate {
  description?: string;
  categories?: string[];
  fileName?: string;
}

/**
 * Database record structure for file conversion
 */
export interface UploadRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  original_url: string | null;
  uploaded_at: string;
  status: string;
  metadata: Record<string, any>;
}

/**
 * Sanitize filename for storage
 * Replaces invalid characters with underscores
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Get storage path for a file
 * Format: {datasetType}/{id}/{sanitizedFileName}
 */
export function getStoragePath(
  datasetType: DatasetType,
  id: string,
  fileName: string
): string {
  const sanitized = sanitizeFilename(fileName);
  return `${datasetType}/${id}/${sanitized}`;
}
