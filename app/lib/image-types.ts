/**
 * Type definitions for image file management
 */

import type { BaseFile, BaseFileCreate, BaseFileUpdate } from "./file-base";

/**
 * Image file interface extending BaseFile
 */
export interface ImageFile extends BaseFile {}

/**
 * Image file creation data
 */
export interface ImageFileCreate extends BaseFileCreate {}

/**
 * Image file update data
 */
export interface ImageFileUpdate extends BaseFileUpdate {}
