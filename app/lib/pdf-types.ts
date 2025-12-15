/**
 * Type definitions for PDF file management
 */

import type { BaseFile, BaseFileCreate, BaseFileUpdate } from "./file-base";

/**
 * PDF file interface extending BaseFile
 */
export interface PdfFile extends BaseFile {
  pageCount?: number; // Number of pages in the PDF
  extractedText?: string; // Extracted text content from PDF (deprecated - use currentExtractionId)
  currentExtractionId?: string | null; // ID of the current AI generation for text extraction
}

/**
 * PDF file creation data
 */
export interface PdfFileCreate extends BaseFileCreate {}

/**
 * PDF file update data
 */
export interface PdfFileUpdate extends BaseFileUpdate {
  currentExtractionId?: string | null;
}
