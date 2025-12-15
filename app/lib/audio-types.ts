/**
 * Type definitions for audio file management
 */

import type { BaseFile, BaseFileCreate, BaseFileUpdate } from "./file-base";

/**
 * Audio file interface extending BaseFile
 */
export interface AudioFile extends BaseFile {
  currentTranscriptId?: string | null; // UUID of the current transcript AI generation
}

/**
 * Audio file creation data
 */
export interface AudioFileCreate extends BaseFileCreate {}

/**
 * Audio file update data
 */
export interface AudioFileUpdate extends BaseFileUpdate {
  currentTranscriptId?: string | null;
}
