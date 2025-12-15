-- Supabase Database Schema Migration
-- Initial schema for UFO Dataset Explorer
-- Creates tables for original uploads, parsed data, and normalized data

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- ORIGINAL UPLOADS TABLE
-- ============================================================================
-- Tracks all uploaded/fetched files with metadata
create table if not exists public.original_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    dataset_type TEXT NOT NULL, -- 'nuforc', 'udb', 'audio', 'huggingface', etc.
    upload_method TEXT NOT NULL, -- 'upload', 'url_fetch', 'api_sync', etc.
    original_url TEXT, -- Original URL if fetched
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by TEXT, -- User identifier (if auth added later)
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'parsed', 'error'
    error_message TEXT, -- Error details if status is 'error'
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional flexible metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for original_uploads
create index if not exists idx_original_uploads_dataset_type on public.original_uploads(dataset_type);
create index if not exists idx_original_uploads_status on public.original_uploads(status);
create index if not exists idx_original_uploads_uploaded_at on public.original_uploads(uploaded_at);
create index if not exists idx_original_uploads_upload_method on public.original_uploads(upload_method);

-- Trigger for updated_at
create trigger update_original_uploads_updated_at
  before update on public.original_uploads
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.original_uploads enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.original_uploads to anon, service_role, supabase_admin;
grant all on public.original_uploads to supabase_admin;

-- ============================================================================
-- NUFORC PARSED TABLE
-- ============================================================================
-- Stores parsed NUFORC dataset records
create table if not exists public.nuforc_parsed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_upload_id UUID REFERENCES original_uploads(id) ON DELETE SET NULL,
    uid TEXT UNIQUE NOT NULL, -- NUFORC record identifier
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Complete original parsed data
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for nuforc_parsed
create index if not exists idx_nuforc_parsed_uid on public.nuforc_parsed(uid);
create index if not exists idx_nuforc_parsed_upload_id on public.nuforc_parsed(original_upload_id);
create index if not exists idx_nuforc_parsed_parsed_at on public.nuforc_parsed(parsed_at);
create index if not exists idx_nuforc_parsed_raw_data on public.nuforc_parsed using gin(raw_data);

-- Trigger for updated_at
create trigger update_nuforc_parsed_updated_at
  before update on public.nuforc_parsed
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.nuforc_parsed enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.nuforc_parsed to anon, service_role, supabase_admin;
grant all on public.nuforc_parsed to supabase_admin;

-- ============================================================================
-- UDB PARSED TABLE
-- ============================================================================
-- Stores parsed UDB (Larry Hatch) dataset records
create table if not exists public.udb_parsed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_upload_id UUID REFERENCES original_uploads(id) ON DELETE SET NULL,
    udb_id INTEGER UNIQUE NOT NULL, -- UDB record ID
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Complete original parsed data
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for udb_parsed
create index if not exists idx_udb_parsed_udb_id on public.udb_parsed(udb_id);
create index if not exists idx_udb_parsed_upload_id on public.udb_parsed(original_upload_id);
create index if not exists idx_udb_parsed_parsed_at on public.udb_parsed(parsed_at);
create index if not exists idx_udb_parsed_raw_data on public.udb_parsed using gin(raw_data);

-- Trigger for updated_at
create trigger update_udb_parsed_updated_at
  before update on public.udb_parsed
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.udb_parsed enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.udb_parsed to anon, service_role, supabase_admin;
grant all on public.udb_parsed to supabase_admin;

-- ============================================================================
-- AUDIO PARSED TABLE
-- ============================================================================
-- Stores parsed audio file metadata and transcriptions
create table if not exists public.audio_parsed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_upload_id UUID REFERENCES original_uploads(id) ON DELETE SET NULL,
    audio_file_id TEXT, -- Reference to existing audio file system (if migrating)
    transcription TEXT, -- Audio transcription if available
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Complete original parsed data
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audio_parsed
create index if not exists idx_audio_parsed_upload_id on public.audio_parsed(original_upload_id);
create index if not exists idx_audio_parsed_audio_file_id on public.audio_parsed(audio_file_id);
create index if not exists idx_audio_parsed_parsed_at on public.audio_parsed(parsed_at);
create index if not exists idx_audio_parsed_raw_data on public.audio_parsed using gin(raw_data);

-- Trigger for updated_at
create trigger update_audio_parsed_updated_at
  before update on public.audio_parsed
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.audio_parsed enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.audio_parsed to anon, service_role, supabase_admin;
grant all on public.audio_parsed to supabase_admin;

-- ============================================================================
-- NORMALIZED DATA TABLE
-- ============================================================================
-- Simple unified schema for cross-dataset queries
create table if not exists public.normalized_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE NOT NULL, -- Unified identifier (may be composite)
    type TEXT NOT NULL, -- Dataset type: 'nuforc', 'udb', 'audio', etc.
    text_content TEXT, -- Main text content
    categories TEXT[] DEFAULT '{}', -- Array of category tags
    date TIMESTAMPTZ, -- Event/report date
    source_id UUID NOT NULL, -- Foreign key to source parsed table (polymorphic)
    source_type TEXT NOT NULL, -- Source table name: 'nuforc_parsed', 'udb_parsed', etc.
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional flexible fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for normalized_data
create index if not exists idx_normalized_data_uid on public.normalized_data(uid);
create index if not exists idx_normalized_data_type on public.normalized_data(type);
create index if not exists idx_normalized_data_date on public.normalized_data(date);
create index if not exists idx_normalized_data_categories on public.normalized_data using gin(categories);
create index if not exists idx_normalized_data_source on public.normalized_data(source_type, source_id);
create index if not exists idx_normalized_data_metadata on public.normalized_data using gin(metadata);

-- Full-text search index for text_content
create index if not exists idx_normalized_data_text_content_fts on public.normalized_data 
    USING gin(to_tsvector('english', COALESCE(text_content, '')));

-- Trigger for updated_at
create trigger update_normalized_data_updated_at
  before update on public.normalized_data
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.normalized_data enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.normalized_data to anon, service_role, supabase_admin;
grant all on public.normalized_data to supabase_admin;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment on TABLE original_uploads IS 'Tracks all uploaded/fetched files with metadata';
comment on TABLE nuforc_parsed IS 'Stores parsed NUFORC dataset records';
comment on TABLE udb_parsed IS 'Stores parsed UDB (Larry Hatch) dataset records';
comment on TABLE audio_parsed IS 'Stores parsed audio file metadata and transcriptions';
comment on TABLE normalized_data IS 'Simple unified schema for cross-dataset queries';

comment on COLUMN original_uploads.dataset_type IS 'Source dataset: nuforc, udb, audio, huggingface, etc.';
comment on COLUMN original_uploads.upload_method IS 'Method used: upload, url_fetch, api_sync, etc.';
comment on COLUMN original_uploads.status IS 'Processing status: pending, processing, parsed, error';
comment on COLUMN normalized_data.source_type IS 'Source table name: nuforc_parsed, udb_parsed, audio_parsed, etc.';
comment on COLUMN normalized_data.uid IS 'Unified identifier, may be composite format like type:id';

