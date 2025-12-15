-- Migration: Add explicit columns to public.udb_parsed table
-- This improves query performance and indexing while maintaining raw_data for flexibility
-- Column names are prefixed with 'udb_' to avoid conflicts with standard PostgreSQL columns

-- Add explicit columns for all UDB fields
alter table public.udb_parsed
  add column if not exists udb_year INTEGER,
  add column if not exists udb_month INTEGER,
  add column if not exists udb_day INTEGER,
  add column if not exists udb_time TEXT,
  add column if not exists udb_location TEXT,
  add column if not exists udb_state_or_province TEXT,
  add column if not exists udb_country TEXT,
  add column if not exists udb_title TEXT,
  add column if not exists udb_description TEXT,
  add column if not exists udb_locale TEXT,
  add column if not exists udb_duration TEXT,
  add column if not exists udb_longitude DOUBLE PRECISION,
  add column if not exists udb_latitude DOUBLE PRECISION,
  add column if not exists udb_elevation TEXT,
  add column if not exists udb_relative_altitude TEXT,
  add column if not exists udb_location_flags TEXT,
  add column if not exists udb_miscellaneous_flags TEXT,
  add column if not exists udb_type_of_ufo_craft_flags TEXT,
  add column if not exists udb_aliens_monsters_flags TEXT,
  add column if not exists udb_apparent_ufo_occupant_activities_flags TEXT,
  add column if not exists udb_places_visited_and_things_affected_flags TEXT,
  add column if not exists udb_evidence_and_special_effects_flags TEXT,
  add column if not exists udb_miscellaneous_details_flags TEXT,
  add column if not exists udb_ref TEXT,
  add column if not exists udb_strangeness INTEGER,
  add column if not exists udb_credibility INTEGER,
  add column if not exists udb_continent TEXT;

-- Create indexes on commonly filtered/sorted columns
create index if not exists idx_udb_parsed_year on public.udb_parsed(udb_year);
create index if not exists idx_udb_parsed_month on public.udb_parsed(udb_month);
create index if not exists idx_udb_parsed_country on public.udb_parsed(udb_country);
create index if not exists idx_udb_parsed_state_or_province on public.udb_parsed(udb_state_or_province);
create index if not exists idx_udb_parsed_credibility on public.udb_parsed(udb_credibility);
create index if not exists idx_udb_parsed_strangeness on public.udb_parsed(udb_strangeness);
create index if not exists idx_udb_parsed_location_coords on public.udb_parsed(udb_latitude, udb_longitude) where udb_latitude is not null AND udb_longitude is not null;

-- Create a composite index for date queries
create index if not exists idx_udb_parsed_date on public.udb_parsed(udb_year, udb_month, udb_day) where udb_year is not null;

-- Create full-text search index on description and title
create index if not exists idx_udb_parsed_description_fts on public.udb_parsed 
  using gin(to_tsvector('english', coalesce(udb_description, '')));
create index if not exists idx_udb_parsed_title_fts on public.udb_parsed 
  using gin(to_tsvector('english', coalesce(udb_title, '')));

-- Function to sync explicit columns from raw_data
-- This can be used to backfill existing records
create or replace function public.sync_udb_explicit_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Extract values from raw_data JSONB and populate explicit columns
  -- Use NULLIF and safe casting to handle empty strings and invalid values
  new.udb_year := nullif(new.raw_data->>'year', '')::integer;
  new.udb_month := nullif(new.raw_data->>'month', '')::integer;
  new.udb_day := nullif(new.raw_data->>'day', '')::integer;
  new.udb_time := nullif(new.raw_data->>'time', '');
  new.udb_location := nullif(new.raw_data->>'location', '');
  new.udb_state_or_province := nullif(new.raw_data->>'stateOrProvince', '');
  new.udb_country := nullif(new.raw_data->>'country', '');
  new.udb_title := nullif(new.raw_data->>'title', '');
  new.udb_description := nullif(new.raw_data->>'description', '');
  
  -- Handle numeric conversions with error handling
  begin
    new.udb_latitude := nullif(new.raw_data->>'latitude', '')::double precision;
  exception when others then
    new.udb_latitude := null;
  end;
  
  begin
    new.udb_longitude := nullif(new.raw_data->>'longitude', '')::double precision;
  exception when others then
    new.udb_longitude := null;
  end;
  
  begin
    new.udb_credibility := nullif(new.raw_data->>'credibility', '')::integer;
  exception when others then
    new.udb_credibility := null;
  end;
  
  begin
    new.udb_strangeness := nullif(new.raw_data->>'strangeness', '')::integer;
  exception when others then
    new.udb_strangeness := null;
  end;
  
  new.udb_duration := nullif(new.raw_data->>'duration', '');
  new.udb_locale := nullif(new.raw_data->>'locale', '');
  new.udb_elevation := nullif(new.raw_data->>'elevation', '');
  new.udb_relative_altitude := nullif(new.raw_data->>'relativeAltitude', '');
  new.udb_location_flags := nullif(new.raw_data->>'locationFlags', '');
  new.udb_miscellaneous_flags := nullif(new.raw_data->>'miscellaneousFlags', '');
  new.udb_type_of_ufo_craft_flags := nullif(new.raw_data->>'typeOfUfoCraftFlags', '');
  new.udb_aliens_monsters_flags := nullif(new.raw_data->>'aliensMonstersFlags', '');
  new.udb_apparent_ufo_occupant_activities_flags := nullif(new.raw_data->>'apparentUfoOccupantActivitiesFlags', '');
  new.udb_places_visited_and_things_affected_flags := nullif(new.raw_data->>'placesVisitedAndThingsAffectedFlags', '');
  new.udb_evidence_and_special_effects_flags := nullif(new.raw_data->>'evidenceAndSpecialEffectsFlags', '');
  new.udb_miscellaneous_details_flags := nullif(new.raw_data->>'miscellaneousDetailsFlags', '');
  new.udb_ref := nullif(new.raw_data->>'ref', '');
  new.udb_continent := nullif(new.raw_data->>'continent', '');
  
  return new;
end;
$$;

-- Create trigger to automatically sync columns on insert/update
drop trigger if exists sync_udb_explicit_columns_trigger on public.udb_parsed;
create trigger sync_udb_explicit_columns_trigger
  before insert or update on public.udb_parsed
  for each row
  execute function public.sync_udb_explicit_columns();

-- Function to backfill all existing records
-- This can be called from the backfill script for efficiency
create or replace function public.backfill_udb_explicit_columns()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  -- Update all records to trigger the sync function
  update public.udb_parsed
  set raw_data = raw_data
  where id is not null;
  
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

comment on FUNCTION backfill_udb_explicit_columns() IS 'Backfills explicit columns (udb_*) from raw_data for all existing records';

-- Backfill existing records (optional - run manually if needed)
-- SELECT backfill_udb_explicit_columns();

comment on COLUMN public.udb_parsed.udb_year IS 'Year of sighting (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_month IS 'Month of sighting 1-12 (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_day IS 'Day of month (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_time IS 'Time of sighting (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_location IS 'Location name (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_state_or_province IS 'State or province (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_country IS 'Country name (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_title IS 'Sighting title (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_description IS 'Sighting description (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_latitude IS 'Latitude coordinate (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_longitude IS 'Longitude coordinate (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_credibility IS 'Credibility rating (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_strangeness IS 'Strangeness rating (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_duration IS 'Duration of sighting (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_locale IS 'Locale type (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_elevation IS 'Elevation (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_relative_altitude IS 'Relative altitude (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_location_flags IS 'Location flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_miscellaneous_flags IS 'Miscellaneous flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_type_of_ufo_craft_flags IS 'Type of UFO craft flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_aliens_monsters_flags IS 'Aliens/monsters flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_apparent_ufo_occupant_activities_flags IS 'Apparent UFO occupant activities flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_places_visited_and_things_affected_flags IS 'Places visited and things affected flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_evidence_and_special_effects_flags IS 'Evidence and special effects flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_miscellaneous_details_flags IS 'Miscellaneous details flags (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_ref IS 'Reference citation (extracted from raw_data)';
comment on COLUMN public.udb_parsed.udb_continent IS 'Continent (extracted from raw_data)';

