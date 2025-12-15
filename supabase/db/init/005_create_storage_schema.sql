-- Create Storage Schema for Supabase Storage
-- This creates the storage schema and necessary tables for bucket management
-- Supabase Storage service should create this automatically, but we create it manually
-- to ensure it exists before bucket setup

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role, supabase_admin;
GRANT ALL ON SCHEMA storage TO postgres, service_role, supabase_admin;

-- Create buckets table (if storage service hasn't created it)
CREATE TABLE IF NOT EXISTS storage.buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    public BOOLEAN NOT NULL DEFAULT false,
    owner UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);

-- Create objects table (for file metadata)
CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID REFERENCES storage.buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(bucket_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_objects_bucket_id ON storage.objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_objects_name ON storage.objects(name);

-- Grant permissions on tables
GRANT ALL ON storage.buckets TO postgres, service_role, supabase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

GRANT ALL ON storage.objects TO postgres, service_role, supabase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA storage 
    GRANT ALL ON TABLES TO postgres, service_role, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage 
    GRANT SELECT ON TABLES TO anon;

COMMENT ON SCHEMA storage IS 'Storage schema for Supabase Storage service';
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file organization';
COMMENT ON TABLE storage.objects IS 'Storage objects (files) metadata';

