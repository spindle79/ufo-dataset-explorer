/**
 * Type definitions for video file management
 */

import type { BaseFile, BaseFileCreate, BaseFileUpdate } from "./file-base";

/**
 * Video file interface extending BaseFile
 */
export interface VideoFile extends BaseFile {
  currentTranscriptId?: string | null; // UUID of the current transcript AI generation
}

/**
 * Video file creation data
 */
export interface VideoFileCreate extends BaseFileCreate {}

/**
 * Video file update data
 */
export interface VideoFileUpdate extends BaseFileUpdate {
  currentTranscriptId?: string | null;
}
