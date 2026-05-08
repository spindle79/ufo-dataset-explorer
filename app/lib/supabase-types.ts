/**
 * Type definitions for Supabase database tables
 *
 * These types correspond to the database schema defined in
 * supabase/db/init/001_initial_schema.sql
 */

/**
 * Original upload status values
 */
export type UploadStatus =
  | "discovered"
  | "pending"
  | "processing"
  | "parsed"
  | "error";

/**
 * Upload method values
 */
export type UploadMethod =
  | "upload"
  | "url_fetch"
  | "url_discovered"
  | "api_sync";

/**
 * Dataset type values
 */
export type DatasetType =
  | "nuforc"
  | "udb"
  | "audio"
  | "video"
  | "pdf"
  | "huggingface"
  | string;

/**
 * Source type for normalized data (polymorphic foreign key)
 */
export type SourceType = "nuforc_parsed" | "udb_parsed" | "audio_parsed";

/**
 * Original Uploads Table
 * Tracks all uploaded/fetched files with metadata
 */
export interface OriginalUpload {
  id: string; // UUID
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  dataset_type: DatasetType;
  upload_method: UploadMethod;
  original_url: string | null;
  canonical_url: string | null; // Normalized URL for efficient lookups
  uploaded_at: string; // ISO timestamp
  uploaded_by: string | null;
  status: UploadStatus;
  error_message: string | null;
  metadata: Record<string, any>; // JSONB
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Original Upload Create (for inserts)
 */
export interface OriginalUploadCreate {
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  dataset_type: DatasetType;
  upload_method: UploadMethod;
  original_url?: string | null;
  canonical_url?: string | null; // Normalized URL for efficient lookups
  uploaded_by?: string | null;
  status?: UploadStatus;
  error_message?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Original Upload Update (for updates)
 */
export interface OriginalUploadUpdate {
  file_name?: string;
  file_path?: string;
  file_size?: number | null;
  mime_type?: string | null;
  status?: UploadStatus;
  error_message?: string | null;
  metadata?: Record<string, any>;
}

/**
 * NUFORC Parsed Table
 * Stores parsed NUFORC dataset records
 */
export interface NuforcParsed {
  id: string; // UUID
  original_upload_id: string | null; // UUID, FK to original_uploads
  uid: string; // NUFORC record identifier (UNIQUE)
  raw_data: Record<string, any>; // JSONB
  parsed_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * NUFORC Parsed Create
 */
export interface NuforcParsedCreate {
  original_upload_id?: string | null;
  uid: string;
  raw_data?: Record<string, any>;
  parsed_at?: string;
}

/**
 * NUFORC Parsed Update
 */
export interface NuforcParsedUpdate {
  original_upload_id?: string | null;
  raw_data?: Record<string, any>;
}

/**
 * UDB Parsed Table
 * Stores parsed UDB (Larry Hatch) dataset records
 *
 * Note: Explicit columns (prefixed with udb_) are automatically synced from raw_data
 * via database trigger. This provides better query performance while maintaining
 * raw_data for flexibility and additional fields.
 */
export interface UdbParsed {
  id: string; // UUID
  original_upload_id: string | null; // UUID, FK to original_uploads
  udb_id: number; // UDB record ID (UNIQUE)
  raw_data: Record<string, any>; // JSONB - complete original data

  // Explicit columns (prefixed with udb_ to avoid conflicts)
  udb_year: number | null; // Year of sighting
  udb_month: number | null; // Month (1-12)
  udb_day: number | null; // Day of month
  udb_time: string | null; // Time of sighting
  udb_location: string | null; // Location name
  udb_state_or_province: string | null; // State or province
  udb_country: string | null; // Country name
  udb_title: string | null; // Sighting title
  udb_description: string | null; // Sighting description
  udb_locale: string | null; // Locale type
  udb_duration: string | null; // Duration of sighting
  udb_longitude: number | null; // Longitude coordinate
  udb_latitude: number | null; // Latitude coordinate
  udb_elevation: string | null; // Elevation
  udb_relative_altitude: string | null; // Relative altitude
  udb_location_flags: string | null; // Location flags
  udb_miscellaneous_flags: string | null; // Miscellaneous flags
  udb_type_of_ufo_craft_flags: string | null; // Type of UFO craft flags
  udb_aliens_monsters_flags: string | null; // Aliens/monsters flags
  udb_apparent_ufo_occupant_activities_flags: string | null; // Apparent UFO occupant activities flags
  udb_places_visited_and_things_affected_flags: string | null; // Places visited and things affected flags
  udb_evidence_and_special_effects_flags: string | null; // Evidence and special effects flags
  udb_miscellaneous_details_flags: string | null; // Miscellaneous details flags
  udb_ref: string | null; // Reference citation
  udb_strangeness: number | null; // Strangeness rating
  udb_credibility: number | null; // Credibility rating
  udb_continent: string | null; // Continent

  parsed_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * UDB Parsed Create
 *
 * Note: When inserting, you only need to provide raw_data. The explicit columns
 * (udb_*) will be automatically populated by the database trigger from raw_data.
 * However, you can also explicitly set them if needed.
 */
export interface UdbParsedCreate {
  original_upload_id?: string | null;
  udb_id: number;
  raw_data?: Record<string, any>;

  // Optional explicit columns (will be auto-populated from raw_data if not provided)
  udb_year?: number | null;
  udb_month?: number | null;
  udb_day?: number | null;
  udb_time?: string | null;
  udb_location?: string | null;
  udb_state_or_province?: string | null;
  udb_country?: string | null;
  udb_title?: string | null;
  udb_description?: string | null;
  udb_locale?: string | null;
  udb_duration?: string | null;
  udb_longitude?: number | null;
  udb_latitude?: number | null;
  udb_elevation?: string | null;
  udb_relative_altitude?: string | null;
  udb_location_flags?: string | null;
  udb_miscellaneous_flags?: string | null;
  udb_type_of_ufo_craft_flags?: string | null;
  udb_aliens_monsters_flags?: string | null;
  udb_apparent_ufo_occupant_activities_flags?: string | null;
  udb_places_visited_and_things_affected_flags?: string | null;
  udb_evidence_and_special_effects_flags?: string | null;
  udb_miscellaneous_details_flags?: string | null;
  udb_ref?: string | null;
  udb_strangeness?: number | null;
  udb_credibility?: number | null;
  udb_continent?: string | null;

  parsed_at?: string;
}

/**
 * UDB Parsed Update
 */
export interface UdbParsedUpdate {
  original_upload_id?: string | null;
  raw_data?: Record<string, any>;

  // Explicit columns can be updated directly
  udb_year?: number | null;
  udb_month?: number | null;
  udb_day?: number | null;
  udb_time?: string | null;
  udb_location?: string | null;
  udb_state_or_province?: string | null;
  udb_country?: string | null;
  udb_title?: string | null;
  udb_description?: string | null;
  udb_locale?: string | null;
  udb_duration?: string | null;
  udb_longitude?: number | null;
  udb_latitude?: number | null;
  udb_elevation?: string | null;
  udb_relative_altitude?: string | null;
  udb_location_flags?: string | null;
  udb_miscellaneous_flags?: string | null;
  udb_type_of_ufo_craft_flags?: string | null;
  udb_aliens_monsters_flags?: string | null;
  udb_apparent_ufo_occupant_activities_flags?: string | null;
  udb_places_visited_and_things_affected_flags?: string | null;
  udb_evidence_and_special_effects_flags?: string | null;
  udb_miscellaneous_details_flags?: string | null;
  udb_ref?: string | null;
  udb_strangeness?: number | null;
  udb_credibility?: number | null;
  udb_continent?: string | null;
}

/**
 * Audio Parsed Table
 * Stores parsed audio file metadata and transcriptions
 */
export interface AudioParsed {
  id: string; // UUID
  original_upload_id: string | null; // UUID, FK to original_uploads
  audio_file_id: string | null; // Reference to existing audio file system
  transcription: string | null;
  raw_data: Record<string, any>; // JSONB
  parsed_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Audio Parsed Create
 */
export interface AudioParsedCreate {
  original_upload_id?: string | null;
  audio_file_id?: string | null;
  transcription?: string | null;
  raw_data?: Record<string, any>;
  parsed_at?: string;
}

/**
 * Audio Parsed Update
 */
export interface AudioParsedUpdate {
  original_upload_id?: string | null;
  audio_file_id?: string | null;
  transcription?: string | null;
  raw_data?: Record<string, any>;
}

/**
 * UFO Clustered Parsed Table
 * Stores parsed UFO clustered dataset records from cjc0013/Ufo_data_clustered
 *
 * Note: Explicit columns (prefixed with ufo_) are automatically synced from raw_data
 * via database trigger. This provides better query performance while maintaining
 * raw_data for flexibility and additional fields.
 */
export interface UfoClusteredParsed {
  id: string; // UUID
  original_upload_id: string | null; // UUID, FK to original_uploads
  uid: string; // Stable row identifier (UNIQUE)
  raw_data: Record<string, any>; // JSONB - complete original data

  // Explicit columns (prefixed with ufo_ to avoid conflicts)
  ufo_t_utc: string | null; // Event timestamp, ISO-8601 UTC
  ufo_lat: number | null; // Latitude coordinate
  ufo_lon: number | null; // Longitude coordinate
  ufo_text: string | null; // Free-text sighting description
  ufo_src: string | null; // Original Kaggle dataset source
  ufo_city: string | null; // City name
  ufo_state: string | null; // State or province
  ufo_country: string | null; // Country code
  ufo_cluster_id: number | null; // Text-similarity cluster ID
  ufo_prob: number | null; // Cluster membership probability
  ufo_moon_illum: number | null; // Moon illumination (0-1)
  ufo_moon_alt_deg: number | null; // Moon altitude in degrees
  ufo_nearest_airport_km: number | null; // Distance to nearest airport in km
  ufo_nearest_airport_code: string | null; // ICAO airport code
  ufo_wx_bucket: string | null; // Weather bucket category
  ufo_reports_z: number | null; // Unused placeholder field

  parsed_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * UFO Clustered Parsed Create
 *
 * Note: When inserting, you only need to provide raw_data. The explicit columns
 * (ufo_*) will be automatically populated by the database trigger from raw_data.
 * However, you can also explicitly set them if needed.
 */
export interface UfoClusteredParsedCreate {
  original_upload_id?: string | null;
  uid: string;
  raw_data?: Record<string, any>;

  // Optional explicit columns (will be auto-populated from raw_data if not provided)
  ufo_t_utc?: string | null;
  ufo_lat?: number | null;
  ufo_lon?: number | null;
  ufo_text?: string | null;
  ufo_src?: string | null;
  ufo_city?: string | null;
  ufo_state?: string | null;
  ufo_country?: string | null;
  ufo_cluster_id?: number | null;
  ufo_prob?: number | null;
  ufo_moon_illum?: number | null;
  ufo_moon_alt_deg?: number | null;
  ufo_nearest_airport_km?: number | null;
  ufo_nearest_airport_code?: string | null;
  ufo_wx_bucket?: string | null;
  ufo_reports_z?: number | null;

  parsed_at?: string;
}

/**
 * UFO Clustered Parsed Update
 */
export interface UfoClusteredParsedUpdate {
  original_upload_id?: string | null;
  raw_data?: Record<string, any>;

  // Explicit columns can be updated directly
  ufo_t_utc?: string | null;
  ufo_lat?: number | null;
  ufo_lon?: number | null;
  ufo_text?: string | null;
  ufo_src?: string | null;
  ufo_city?: string | null;
  ufo_state?: string | null;
  ufo_country?: string | null;
  ufo_cluster_id?: number | null;
  ufo_prob?: number | null;
  ufo_moon_illum?: number | null;
  ufo_moon_alt_deg?: number | null;
  ufo_nearest_airport_km?: number | null;
  ufo_nearest_airport_code?: string | null;
  ufo_wx_bucket?: string | null;
  ufo_reports_z?: number | null;
}

/**
 * AI Generations Table
 * Stores AI-generated content (transcripts, documents, etc.) with versioning
 */
export interface AiGeneration {
  id: string; // UUID
  source_type: string; // Type of source: 'audio', 'pdf', etc.
  source_id: string; // ID of the source item
  generation_type: string; // Type of generation: 'transcript', 'summary', 'document', etc.
  version: number; // Version number for this generation
  text_content: string | null; // Main text content
  documents: Record<string, any>; // JSONB - Generated documents if applicable
  metadata: Record<string, any>; // JSONB - Additional metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * AI Generation Create
 */
export interface AiGenerationCreate {
  source_type: string;
  source_id: string;
  generation_type: string;
  version?: number;
  text_content?: string | null;
  documents?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * AI Generation Update
 */
export interface AiGenerationUpdate {
  text_content?: string | null;
  documents?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Normalized Data Table
 * Simple unified schema for cross-dataset queries
 */
export interface NormalizedData {
  id: string; // UUID
  uid: string; // Unified identifier (UNIQUE)
  type: DatasetType;
  text_content: string | null;
  categories: string[]; // TEXT[]
  date: string | null; // ISO timestamp
  source_id: string; // UUID, polymorphic FK to source parsed table
  source_type: SourceType;
  metadata: Record<string, any>; // JSONB
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Normalized Data Create
 */
export interface NormalizedDataCreate {
  uid: string;
  type: DatasetType;
  text_content?: string | null;
  categories?: string[];
  date?: string | null;
  source_id: string;
  source_type: SourceType;
  metadata?: Record<string, any>;
}

/**
 * Scraped Pages Table
 * Stores scraped web pages with metadata
 */
export interface ScrapedPage {
  id: string; // UUID
  url: string;
  canonical_url: string | null; // Normalized URL for efficient lookups
  domain: string | null;
  title: string;
  description: string;
  categories: string[];
  markdown_path: string | null;
  html_path: string | null;
  file_size: number | null;
  error: string | null;
  scraped_date: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface ScrapedPageCreate {
  url: string;
  canonical_url?: string | null; // Normalized URL for efficient lookups
  domain?: string | null;
  title: string;
  description?: string;
  categories?: string[];
  markdown_path?: string | null;
  html_path?: string | null;
  file_size?: number | null;
  error?: string | null;
}

export interface ScrapedPageUpdate {
  title?: string;
  description?: string;
  categories?: string[];
  markdown_path?: string | null;
  html_path?: string | null;
  file_size?: number | null;
  error?: string | null;
  domain?: string | null;
  canonical_url?: string | null;
}

/**
 * Normalized Data Update
 */
/**
 * People Table
 * Stores information about people referenced in the dataset
 */
export interface People {
  id: string; // UUID
  name: string; // Primary name of the person
  aliases: string[]; // Array of alternative names/references
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface PeopleCreate {
  name: string;
  aliases?: string[];
}

export interface PeopleUpdate {
  name?: string;
  aliases?: string[];
}

/**
 * Locations Table
 * Stores information about locations referenced in the dataset
 */
export interface Locations {
  id: string; // UUID
  name: string; // Primary name of the location
  aliases: string[]; // Array of alternative names/references
  latitude: number | null; // Geographic latitude (-90 to 90)
  longitude: number | null; // Geographic longitude (-180 to 180)
  address: string | null; // Street address
  city: string | null; // City name
  state: string | null; // State/province name
  country: string | null; // Country name
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface LocationsCreate {
  name: string;
  aliases?: string[];
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface LocationsUpdate {
  name?: string;
  aliases?: string[];
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

/**
 * Companies Table
 * Stores information about companies referenced in the dataset
 */
export interface Companies {
  id: string; // UUID
  name: string; // Primary name of the company
  aliases: string[]; // Array of alternative names/references
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CompaniesCreate {
  name: string;
  aliases?: string[];
}

export interface CompaniesUpdate {
  name?: string;
  aliases?: string[];
}

/**
 * Programs Table
 * Stores information about programs referenced in the dataset
 */
export interface Programs {
  id: string; // UUID
  name: string; // Primary name of the program
  aliases: string[]; // Array of alternative names/references
  description: string | null; // Optional description of the program
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface ProgramsCreate {
  name: string;
  aliases?: string[];
  description?: string | null;
}

export interface ProgramsUpdate {
  name?: string;
  aliases?: string[];
  description?: string | null;
}

export interface NormalizedDataUpdate {
  uid?: string;
  type?: DatasetType;
  text_content?: string | null;
  categories?: string[];
  date?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Duplicate Pairs Table
 * Tracks potential duplicate records for review
 */
export interface DuplicatePair {
  id: string; // UUID
  entity_type: string; // Type of entity: 'audio', 'video', 'pdf', 'image', 'scrape', 'people', 'locations', 'companies', 'programs'
  record1_id: string; // UUID - First record ID
  record2_id: string; // UUID - Second record ID
  similarity_score: number; // Similarity score (0.0 to 1.0)
  similarity_reasons: string[]; // Array of reasons why they're similar
  status: "pending" | "not_duplicate" | "merged" | "skipped"; // Status
  merge_data: Record<string, any>; // Field selection for merge (if merged)
  reviewed_at: string | null; // ISO timestamp
  reviewed_by: string | null; // User who reviewed
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface DuplicatePairCreate {
  entity_type: string;
  record1_id: string;
  record2_id: string;
  similarity_score?: number;
  similarity_reasons?: string[];
  status?: "pending" | "not_duplicate" | "merged" | "skipped";
  merge_data?: Record<string, any>;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface DuplicatePairUpdate {
  status?: "pending" | "not_duplicate" | "merged" | "skipped";
  merge_data?: Record<string, any>;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

/**
 * Database helper types for Supabase responses
 */
export type Database = {
  public: {
    Tables: {
      original_uploads: {
        Row: OriginalUpload;
        Insert: OriginalUploadCreate;
        Update: OriginalUploadUpdate;
      };
      nuforc_parsed: {
        Row: NuforcParsed;
        Insert: NuforcParsedCreate;
        Update: NuforcParsedUpdate;
      };
      udb_parsed: {
        Row: UdbParsed;
        Insert: UdbParsedCreate;
        Update: UdbParsedUpdate;
      };
      audio_parsed: {
        Row: AudioParsed;
        Insert: AudioParsedCreate;
        Update: AudioParsedUpdate;
      };
      normalized_data: {
        Row: NormalizedData;
        Insert: NormalizedDataCreate;
        Update: NormalizedDataUpdate;
      };
      people: {
        Row: People;
        Insert: PeopleCreate;
        Update: PeopleUpdate;
      };
      locations: {
        Row: Locations;
        Insert: LocationsCreate;
        Update: LocationsUpdate;
      };
      companies: {
        Row: Companies;
        Insert: CompaniesCreate;
        Update: CompaniesUpdate;
      };
      programs: {
        Row: Programs;
        Insert: ProgramsCreate;
        Update: ProgramsUpdate;
      };
      duplicate_pairs: {
        Row: DuplicatePair;
        Insert: DuplicatePairCreate;
        Update: DuplicatePairUpdate;
      };
    };
  };
};
