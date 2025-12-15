-- Migration: Create ufo_clustered_parsed table
-- This table stores the cleaned and unified UFO sightings dataset (~327k rows)
-- from the cjc0013/Ufo_data_clustered Hugging Face dataset
-- 
-- The dataset merges several publicly available UFO sighting datasets from Kaggle
-- into one cleaned, standardized, and enriched file.

-- Create the ufo_clustered_parsed table
create table if not exists public.ufo_clustered_parsed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_upload_id UUID REFERENCES original_uploads(id) ON DELETE SET NULL,
    uid TEXT UNIQUE NOT NULL, -- Stable row identifier from dataset
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Complete original parsed data
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add explicit columns for commonly queried fields (prefixed with ufo_ to avoid conflicts)
alter table public.ufo_clustered_parsed
  add column if not exists ufo_t_utc TIMESTAMPTZ, -- Event timestamp, ISO-8601 UTC
  add column if not exists ufo_lat DOUBLE PRECISION, -- Latitude coordinate
  add column if not exists ufo_lon DOUBLE PRECISION, -- Longitude coordinate
  add column if not exists ufo_text TEXT, -- Free-text sighting description
  add column if not exists ufo_src TEXT, -- Original Kaggle dataset source
  add column if not exists ufo_city TEXT, -- City name
  add column if not exists ufo_state TEXT, -- State or province
  add column if not exists ufo_country TEXT, -- Country code
  add column if not exists ufo_cluster_id INTEGER, -- Text-similarity cluster ID
  add column if not exists ufo_prob DOUBLE PRECISION, -- Cluster membership probability
  add column if not exists ufo_moon_illum DOUBLE PRECISION, -- Moon illumination (0-1)
  add column if not exists ufo_moon_alt_deg DOUBLE PRECISION, -- Moon altitude in degrees
  add column if not exists ufo_nearest_airport_km DOUBLE PRECISION, -- Distance to nearest airport
  add column if not exists ufo_nearest_airport_code TEXT, -- ICAO airport code
  add column if not exists ufo_wx_bucket TEXT, -- Weather bucket category
  add column if not exists ufo_reports_z DOUBLE PRECISION; -- Unused placeholder field

-- Indexes for ufo_clustered_parsed
create index if not exists idx_ufo_clustered_parsed_uid on public.ufo_clustered_parsed(uid);
create index if not exists idx_ufo_clustered_parsed_upload_id on public.ufo_clustered_parsed(original_upload_id);
create index if not exists idx_ufo_clustered_parsed_parsed_at on public.ufo_clustered_parsed(parsed_at);
create index if not exists idx_ufo_clustered_parsed_raw_data on public.ufo_clustered_parsed using gin(raw_data);

-- Indexes on explicit columns for common queries
create index if not exists idx_ufo_clustered_parsed_t_utc on public.ufo_clustered_parsed(ufo_t_utc);
create index if not exists idx_ufo_clustered_parsed_country on public.ufo_clustered_parsed(ufo_country);
create index if not exists idx_ufo_clustered_parsed_state on public.ufo_clustered_parsed(ufo_state);
create index if not exists idx_ufo_clustered_parsed_city on public.ufo_clustered_parsed(ufo_city);
create index if not exists idx_ufo_clustered_parsed_src on public.ufo_clustered_parsed(ufo_src);
create index if not exists idx_ufo_clustered_parsed_cluster_id on public.ufo_clustered_parsed(ufo_cluster_id);
create index if not exists idx_ufo_clustered_parsed_wx_bucket on public.ufo_clustered_parsed(ufo_wx_bucket);
create index if not exists idx_ufo_clustered_parsed_location_coords on public.ufo_clustered_parsed(ufo_lat, ufo_lon) where ufo_lat is not null AND ufo_lon is not null;

-- Full-text search index on text field
create index if not exists idx_ufo_clustered_parsed_text_fts on public.ufo_clustered_parsed 
  using gin(to_tsvector('english', coalesce(ufo_text, '')));

-- Trigger for updated_at
create trigger update_ufo_clustered_parsed_updated_at
  before update on public.ufo_clustered_parsed
  for each row
  execute function public.update_updated_at_column();

-- Function to sync explicit columns from raw_data
create or replace function public.sync_ufo_clustered_explicit_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Extract values from raw_data JSONB and populate explicit columns
  new.ufo_t_utc := nullif(new.raw_data->>'t_utc', '')::timestamptz;
  new.ufo_text := nullif(new.raw_data->>'text', '');
  new.ufo_src := nullif(new.raw_data->>'src', '');
  new.ufo_city := nullif(new.raw_data->>'city', '');
  new.ufo_state := nullif(new.raw_data->>'state', '');
  new.ufo_country := nullif(new.raw_data->>'country', '');
  new.ufo_nearest_airport_code := nullif(new.raw_data->>'nearest_airport_code', '');
  new.ufo_wx_bucket := nullif(new.raw_data->>'wx_bucket', '');
  
  -- Handle numeric conversions with error handling
  begin
    new.ufo_lat := nullif(new.raw_data->>'lat', '')::double precision;
  exception when others then
    new.ufo_lat := null;
  end;
  
  begin
    new.ufo_lon := nullif(new.raw_data->>'lon', '')::double precision;
  exception when others then
    new.ufo_lon := null;
  end;
  
  begin
    new.ufo_cluster_id := nullif(new.raw_data->>'cluster_id', '')::integer;
  exception when others then
    new.ufo_cluster_id := null;
  end;
  
  begin
    new.ufo_prob := nullif(new.raw_data->>'prob', '')::double precision;
  exception when others then
    new.ufo_prob := null;
  end;
  
  begin
    new.ufo_moon_illum := nullif(new.raw_data->>'moon_illum', '')::double precision;
  exception when others then
    new.ufo_moon_illum := null;
  end;
  
  begin
    new.ufo_moon_alt_deg := nullif(new.raw_data->>'moon_alt_deg', '')::double precision;
  exception when others then
    new.ufo_moon_alt_deg := null;
  end;
  
  begin
    new.ufo_nearest_airport_km := nullif(new.raw_data->>'nearest_airport_km', '')::double precision;
  exception when others then
    new.ufo_nearest_airport_km := null;
  end;
  
  begin
    new.ufo_reports_z := nullif(new.raw_data->>'reports_z', '')::double precision;
  exception when others then
    new.ufo_reports_z := null;
  end;
  
  return new;
end;
$$;

-- Create trigger to automatically sync columns on insert/update
drop trigger if exists sync_ufo_clustered_explicit_columns_trigger on public.ufo_clustered_parsed;
create trigger sync_ufo_clustered_explicit_columns_trigger
  before insert or update on public.ufo_clustered_parsed
  for each row
  execute function public.sync_ufo_clustered_explicit_columns();

-- Enable Row Level Security (required for all tables)
alter table public.ufo_clustered_parsed enable row level security;

-- RLS Policies for public read access
-- Policy for SELECT (anon role)
create policy "ufo_clustered_parsed_select_anon" on public.ufo_clustered_parsed
  for select
  to anon
  using (true);

-- Policy for SELECT (authenticated role)
create policy "ufo_clustered_parsed_select_authenticated" on public.ufo_clustered_parsed
  for select
  to authenticated
  using (true);

-- Policy for INSERT (anon role)
create policy "ufo_clustered_parsed_insert_anon" on public.ufo_clustered_parsed
  for insert
  to anon
  with check (true);

-- Policy for INSERT (authenticated role)
create policy "ufo_clustered_parsed_insert_authenticated" on public.ufo_clustered_parsed
  for insert
  to authenticated
  with check (true);

-- Policy for UPDATE (anon role)
create policy "ufo_clustered_parsed_update_anon" on public.ufo_clustered_parsed
  for update
  to anon
  using (true)
  with check (true);

-- Policy for UPDATE (authenticated role)
create policy "ufo_clustered_parsed_update_authenticated" on public.ufo_clustered_parsed
  for update
  to authenticated
  using (true)
  with check (true);

-- Policy for DELETE (anon role)
create policy "ufo_clustered_parsed_delete_anon" on public.ufo_clustered_parsed
  for delete
  to anon
  using (true);

-- Policy for DELETE (authenticated role)
create policy "ufo_clustered_parsed_delete_authenticated" on public.ufo_clustered_parsed
  for delete
  to authenticated
  using (true);

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.ufo_clustered_parsed to anon, service_role, supabase_admin;
grant all on public.ufo_clustered_parsed to supabase_admin;

-- Column comments
comment on table public.ufo_clustered_parsed IS 'Stores cleaned and unified UFO sightings dataset from cjc0013/Ufo_data_clustered (~327k rows)';
comment on column public.ufo_clustered_parsed.uid IS 'Stable row identifier from the dataset';
comment on column public.ufo_clustered_parsed.ufo_t_utc IS 'Event timestamp, ISO-8601 UTC (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_lat IS 'Latitude coordinate (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_lon IS 'Longitude coordinate (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_text IS 'Free-text sighting description (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_src IS 'Original Kaggle dataset source (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_city IS 'City name (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_state IS 'State or province (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_country IS 'Country code (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_cluster_id IS 'Text-similarity cluster ID (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_prob IS 'Cluster membership probability (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_moon_illum IS 'Moon illumination fraction 0-1 (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_moon_alt_deg IS 'Moon altitude in degrees (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_nearest_airport_km IS 'Distance to nearest airport in km (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_nearest_airport_code IS 'ICAO airport code (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_wx_bucket IS 'Weather bucket category (extracted from raw_data)';
comment on column public.ufo_clustered_parsed.ufo_reports_z IS 'Unused placeholder field (extracted from raw_data)';

