# Supabase Database Schema Documentation

This document describes the complete database schema for the UFO Dataset Explorer, including table structures, relationships, and usage patterns.

## Overview

The database schema follows a three-tier architecture:

1. **Original Uploads** - Tracks all uploaded/fetched files with metadata
2. **Parsed Data Tables** - Dataset-specific tables storing parsed records
3. **Normalized Data** - Unified schema for cross-dataset queries

## Architecture Diagram

```
┌─────────────────────────────────────┐
│   Supabase Storage (Files)          │
│   - original-uploads                 │
│   - nuforc-files                     │
│   - udb-files                        │
│   - audio-files                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   original_uploads (metadata)        │
│   - file_name, file_path, status     │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────────┐  ┌──────────────┐
│ nuforc_parsed│  │  udb_parsed  │
│              │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬─────────┘
                │
                ▼
       ┌─────────────────┐
       │ normalized_data │
       │ (unified schema)│
       └─────────────────┘
```

## Tables

### `original_uploads`

Tracks all uploaded/fetched files with metadata. This is the entry point for all data ingestion.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique upload identifier |
| `file_name` | TEXT | NOT NULL | Original filename |
| `file_path` | TEXT | NOT NULL | Path in Supabase Storage |
| `file_size` | BIGINT | | File size in bytes |
| `mime_type` | TEXT | | MIME type of the file |
| `dataset_type` | TEXT | NOT NULL | Source dataset: 'nuforc', 'udb', 'audio', 'huggingface', etc. |
| `upload_method` | TEXT | NOT NULL | Method: 'upload', 'url_fetch', 'api_sync', etc. |
| `original_url` | TEXT | | Original URL if fetched from web |
| `uploaded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Upload timestamp |
| `uploaded_by` | TEXT | | User identifier (if auth added later) |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | Status: 'pending', 'processing', 'parsed', 'error' |
| `error_message` | TEXT | | Error details if status is 'error' |
| `metadata` | JSONB | DEFAULT '{}' | Additional flexible metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_original_uploads_dataset_type` on `dataset_type`
- `idx_original_uploads_status` on `status`
- `idx_original_uploads_uploaded_at` on `uploaded_at`
- `idx_original_uploads_upload_method` on `upload_method`

**Status Values:**
- `pending` - File uploaded, not yet processed
- `processing` - Currently being parsed
- `parsed` - Successfully parsed and stored
- `error` - Parsing failed

**Usage Example:**

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';
import type { OriginalUploadCreate } from '@/lib/supabase-types';

const supabase = getSupabaseAdmin();

// Create upload record
const { data, error } = await supabase
  .from('original_uploads')
  .insert({
    file_name: 'nuforc_reports.csv',
    file_path: 'nuforc/550e8400-e29b-41d4-a716-446655440000/nuforc_reports.csv',
    file_size: 1024000,
    mime_type: 'text/csv',
    dataset_type: 'nuforc',
    upload_method: 'upload',
    status: 'pending',
  })
  .select()
  .single();
```

### `nuforc_parsed`

Stores parsed NUFORC dataset records. Each record represents a single NUFORC sighting report.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `original_upload_id` | UUID | FK → `original_uploads.id`, NULL allowed | Reference to source upload |
| `uid` | TEXT | UNIQUE, NOT NULL | NUFORC record identifier |
| `raw_data` | JSONB | NOT NULL, DEFAULT '{}' | Complete original parsed data |
| `parsed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Parsing timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_nuforc_parsed_uid` on `uid` (UNIQUE)
- `idx_nuforc_parsed_upload_id` on `original_upload_id`
- `idx_nuforc_parsed_parsed_at` on `parsed_at`
- `idx_nuforc_parsed_raw_data` on `raw_data` (GIN index for JSONB queries)

**Usage Example:**

```typescript
// Insert parsed NUFORC record
const { data, error } = await supabase
  .from('nuforc_parsed')
  .insert({
    original_upload_id: uploadId,
    uid: 'nuforc-12345',
    raw_data: {
      date: '2019-04-10',
      city: 'Gold Canyon',
      state: 'AZ',
      description: 'Bright light in sky...',
      // ... other fields
    },
  });

// Query with JSONB
const { data } = await supabase
  .from('nuforc_parsed')
  .select('*')
  .eq('raw_data->>state', 'AZ');
```

### `udb_parsed`

Stores parsed UDB (Larry Hatch) dataset records. Each record represents a single UDB sighting.

**Architecture:**

This table uses a **hybrid approach** with both explicit columns and JSONB:
- **Explicit columns** (prefixed with `udb_`) for commonly queried fields - provides better query performance and indexing
- **`raw_data` JSONB** for complete original data and additional fields - provides flexibility
- **Automatic sync**: A database trigger automatically populates explicit columns from `raw_data` on insert/update

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `original_upload_id` | UUID | FK → `original_uploads.id`, NULL allowed | Reference to source upload (may not always exist) |
| `udb_id` | INTEGER | UNIQUE, NOT NULL | UDB record ID |
| `raw_data` | JSONB | NOT NULL, DEFAULT '{}' | Complete original parsed data |
| `udb_year` | INTEGER | NULL | Year of sighting (auto-synced from raw_data) |
| `udb_month` | INTEGER | NULL | Month (1-12) (auto-synced from raw_data) |
| `udb_day` | INTEGER | NULL | Day of month (auto-synced from raw_data) |
| `udb_time` | TEXT | NULL | Time of sighting (auto-synced from raw_data) |
| `udb_location` | TEXT | NULL | Location name (auto-synced from raw_data) |
| `udb_state_or_province` | TEXT | NULL | State or province (auto-synced from raw_data) |
| `udb_country` | TEXT | NULL | Country name (auto-synced from raw_data) |
| `udb_title` | TEXT | NULL | Sighting title (auto-synced from raw_data) |
| `udb_description` | TEXT | NULL | Sighting description (auto-synced from raw_data) |
| `udb_latitude` | DOUBLE PRECISION | NULL | Latitude coordinate (auto-synced from raw_data) |
| `udb_longitude` | DOUBLE PRECISION | NULL | Longitude coordinate (auto-synced from raw_data) |
| `udb_credibility` | INTEGER | NULL | Credibility rating (auto-synced from raw_data) |
| `udb_strangeness` | INTEGER | NULL | Strangeness rating (auto-synced from raw_data) |
| `udb_duration` | TEXT | NULL | Duration of sighting (auto-synced from raw_data) |
| `parsed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Parsing timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_udb_parsed_udb_id` on `udb_id` (UNIQUE)
- `idx_udb_parsed_upload_id` on `original_upload_id`
- `idx_udb_parsed_parsed_at` on `parsed_at`
- `idx_udb_parsed_raw_data` on `raw_data` (GIN index)
- `idx_udb_parsed_year` on `udb_year`
- `idx_udb_parsed_month` on `udb_month`
- `idx_udb_parsed_country` on `udb_country`
- `idx_udb_parsed_state_or_province` on `udb_state_or_province`
- `idx_udb_parsed_credibility` on `udb_credibility`
- `idx_udb_parsed_strangeness` on `udb_strangeness`
- `idx_udb_parsed_location_coords` on `(udb_latitude, udb_longitude)` (partial index)
- `idx_udb_parsed_date` on `(udb_year, udb_month, udb_day)` (composite index)
- `idx_udb_parsed_description_fts` on `udb_description` (full-text search)
- `idx_udb_parsed_title_fts` on `udb_title` (full-text search)

**Usage Example:**

```typescript
// Insert parsed UDB record - explicit columns are auto-populated from raw_data
const { data, error } = await supabase
  .from('udb_parsed')
  .insert({
    udb_id: 12345,
    raw_data: {
      year: 2019,
      month: 4,
      day: 10,
      location: 'Gold Canyon, AZ',
      description: 'Bright light...',
      // ... other fields
    },
  });

// Query using explicit columns (much faster than JSONB queries)
const { data } = await supabase
  .from('udb_parsed')
  .select('*')
  .eq('udb_year', 2019)
  .eq('udb_country', 'United States')
  .gte('udb_credibility', 6)
  .order('udb_credibility', { ascending: false });

// Full-text search on description
const { data } = await supabase
  .from('udb_parsed')
  .select('*')
  .textSearch('udb_description', 'bright light', {
    type: 'websearch',
    config: 'english',
  });
```

### `audio_parsed`

Stores parsed audio file metadata and transcriptions. Links audio files to their parsed content.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `original_upload_id` | UUID | FK → `original_uploads.id`, NULL allowed | Reference to source upload |
| `audio_file_id` | TEXT | | Reference to existing audio file system (if migrating) |
| `transcription` | TEXT | | Audio transcription if available |
| `raw_data` | JSONB | NOT NULL, DEFAULT '{}' | Complete original parsed data |
| `parsed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Parsing timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_audio_parsed_upload_id` on `original_upload_id`
- `idx_audio_parsed_audio_file_id` on `audio_file_id`
- `idx_audio_parsed_parsed_at` on `parsed_at`
- `idx_audio_parsed_raw_data` on `raw_data` (GIN index)

**Usage Example:**

```typescript
// Insert parsed audio record
const { data, error } = await supabase
  .from('audio_parsed')
  .insert({
    original_upload_id: uploadId,
    transcription: 'This is the transcribed text...',
    raw_data: {
      duration: 120,
      format: 'mp3',
      // ... other metadata
    },
  });
```

### `normalized_data`

Simple unified schema for cross-dataset queries. This table allows querying across all datasets using a common structure.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `uid` | TEXT | UNIQUE, NOT NULL | Unified identifier (may be composite like 'nuforc:12345') |
| `type` | TEXT | NOT NULL | Dataset type: 'nuforc', 'udb', 'audio', etc. |
| `text_content` | TEXT | | Main text content (description, transcription, etc.) |
| `categories` | TEXT[] | DEFAULT '{}' | Array of category tags |
| `date` | TIMESTAMPTZ | | Event/report date |
| `source_id` | UUID | NOT NULL | Foreign key to source parsed table (polymorphic) |
| `source_type` | TEXT | NOT NULL | Source table name: 'nuforc_parsed', 'udb_parsed', 'audio_parsed' |
| `metadata` | JSONB | DEFAULT '{}' | Additional flexible fields |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_normalized_data_uid` on `uid` (UNIQUE)
- `idx_normalized_data_type` on `type`
- `idx_normalized_data_date` on `date`
- `idx_normalized_data_categories` on `categories` (GIN index for array search)
- `idx_normalized_data_source` on `(source_type, source_id)`
- `idx_normalized_data_metadata` on `metadata` (GIN index)
- `idx_normalized_data_text_content_fts` on `text_content` (Full-text search)

**UID Format:**

The `uid` field uses a composite format to ensure uniqueness across datasets:
- `nuforc:{nuforc_uid}` - e.g., `nuforc:2019-04-10T17:00:00_Gold_Canyon_AZ`
- `udb:{udb_id}` - e.g., `udb:12345`
- `audio:{audio_id}` - e.g., `audio:550e8400-e29b-41d4-a716-446655440000`

**Usage Example:**

```typescript
// Insert normalized record
const { data, error } = await supabase
  .from('normalized_data')
  .insert({
    uid: 'nuforc:2019-04-10T17:00:00_Gold_Canyon_AZ',
    type: 'nuforc',
    text_content: 'Bright light in sky moving erratically...',
    categories: ['light', 'moving', 'daytime'],
    date: '2019-04-10T17:00:00Z',
    source_id: nuforcParsedId,
    source_type: 'nuforc_parsed',
    metadata: {
      city: 'Gold Canyon',
      state: 'AZ',
    },
  });

// Cross-dataset query
const { data } = await supabase
  .from('normalized_data')
  .select('*')
  .eq('type', 'nuforc')
  .contains('categories', ['light'])
  .gte('date', '2019-01-01')
  .order('date', { ascending: false });

// Full-text search
const { data } = await supabase
  .from('normalized_data')
  .select('*')
  .textSearch('text_content', 'bright light', {
    type: 'websearch',
    config: 'english',
  });
```

## Relationships

### Foreign Key Relationships

1. **`nuforc_parsed.original_upload_id`** → `original_uploads.id`
   - ON DELETE SET NULL (upload can be deleted, parsed data remains)

2. **`udb_parsed.original_upload_id`** → `original_uploads.id`
   - ON DELETE SET NULL

3. **`audio_parsed.original_upload_id`** → `original_uploads.id`
   - ON DELETE SET NULL

4. **`normalized_data.source_id`** → Polymorphic reference
   - References `id` in table specified by `source_type`
   - No foreign key constraint (polymorphic relationship)

### Data Flow

1. **Upload** → File stored in Supabase Storage
2. **Record Upload** → `original_uploads` table entry created
3. **Parse** → File parsed, entry created in dataset-specific table (`nuforc_parsed`, `udb_parsed`, etc.)
4. **Normalize** → Entry created in `normalized_data` with unified schema

## Triggers

### Automatic `updated_at` Updates

All tables have a trigger that automatically updates the `updated_at` column when a row is modified:

```sql
CREATE TRIGGER update_{table}_updated_at
    BEFORE UPDATE ON {table}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

This ensures `updated_at` is always current without manual updates.

## Indexing Strategy

### B-Tree Indexes
- Used for equality and range queries
- Applied to: foreign keys, unique identifiers, dates, status fields

### GIN Indexes
- Used for JSONB and array columns
- Enables efficient queries on nested JSON data and array containment
- Applied to: `raw_data` (JSONB), `categories` (TEXT[]), `metadata` (JSONB)

### Full-Text Search Index
- Used for text content search
- Applied to: `text_content` in `normalized_data`
- Uses PostgreSQL's `to_tsvector` for English language search

## Best Practices

### 1. Always Use Transactions for Multi-Step Operations

```typescript
// Upload file, create record, parse, normalize
const { data: upload } = await supabase
  .from('original_uploads')
  .insert({...})
  .select()
  .single();

// Parse and create parsed record
const { data: parsed } = await supabase
  .from('nuforc_parsed')
  .insert({ original_upload_id: upload.id, ... })
  .select()
  .single();

// Normalize
await supabase
  .from('normalized_data')
  .insert({ source_id: parsed.id, source_type: 'nuforc_parsed', ... });
```

### 2. Use JSONB for Flexible Schema

Store variable fields in `raw_data` JSONB column:

```typescript
raw_data: {
  // All original fields preserved
  field1: 'value1',
  field2: 'value2',
  nested: {
    data: 'here'
  }
}
```

### 3. Query JSONB Efficiently

```typescript
// Access nested JSONB fields
.eq('raw_data->>state', 'AZ')  // Text extraction
.eq('raw_data->city', '"Phoenix"')  // JSON extraction
.gte('raw_data->>date', '2019-01-01')  // Comparison
```

### 4. Use Array Operations for Categories

```typescript
// Check if array contains value
.contains('categories', ['light'])

// Check if array overlaps
.overlaps('categories', ['light', 'moving'])
```

### 5. Update Status Fields

Track processing status in `original_uploads.status`:

```typescript
// Mark as processing
await supabase
  .from('original_uploads')
  .update({ status: 'processing' })
  .eq('id', uploadId);

// Mark as parsed
await supabase
  .from('original_uploads')
  .update({ status: 'parsed' })
  .eq('id', uploadId);

// Mark as error
await supabase
  .from('original_uploads')
  .update({ 
    status: 'error',
    error_message: 'Failed to parse: ...'
  })
  .eq('id', uploadId);
```

## Migration

The schema is automatically applied when Supabase starts if the migration file is in `supabase/db/init/`.

To manually apply:

1. Connect to Supabase Studio: http://localhost:3001
2. Navigate to SQL Editor
3. Run the migration file: `supabase/db/init/001_initial_schema.sql`

## TypeScript Types

All table types are defined in `app/lib/supabase-types.ts`:

- `OriginalUpload`, `OriginalUploadCreate`, `OriginalUploadUpdate`
- `NuforcParsed`, `NuforcParsedCreate`, `NuforcParsedUpdate`
- `UdbParsed`, `UdbParsedCreate`, `UdbParsedUpdate`
- `AudioParsed`, `AudioParsedCreate`, `AudioParsedUpdate`
- `NormalizedData`, `NormalizedDataCreate`, `NormalizedDataUpdate`

## Related Documentation

- [Supabase Setup Guide](./supabase-setup.md)
- [Storage Setup Guide](./supabase-storage-setup.md)
- [Data Access Architecture](./data-access-architecture.md)

