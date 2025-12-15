-- ============================================================================
-- Migration: Create People, Locations, Companies, and Programs Tables
-- ============================================================================
-- Purpose: Create reference tables for entities that may be referenced
--          across the dataset with support for aliases to handle multiple
--          naming conventions (e.g., "Apple" vs "Apple Inc.")
-- ============================================================================

-- ============================================================================
-- PEOPLE TABLE
-- ============================================================================
-- Stores information about people referenced in the dataset
create table if not exists public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Primary name of the person
    aliases TEXT[] DEFAULT '{}'::text[], -- Array of alternative names/references
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

comment on table public.people is 'Stores information about people referenced in the dataset. Supports aliases for alternative naming conventions.';
comment on column public.people.name is 'Primary name of the person';
comment on column public.people.aliases is 'Array of alternative names or ways this person may be referenced';

-- Indexes for people
create index if not exists idx_people_name on public.people(name);
create index if not exists idx_people_aliases on public.people using gin(aliases);
create index if not exists idx_people_created_at on public.people(created_at);

-- Full-text search index for name
create index if not exists idx_people_name_fts on public.people 
    USING gin(to_tsvector('english', COALESCE(name, '')));

-- Trigger for updated_at
create trigger update_people_updated_at
  before update on public.people
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.people enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.people to anon, service_role, supabase_admin;
grant all on public.people to supabase_admin;

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================
-- Stores information about locations referenced in the dataset
create table if not exists public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Primary name of the location
    aliases TEXT[] DEFAULT '{}'::text[], -- Array of alternative names/references
    latitude NUMERIC(10, 8), -- Geographic latitude (-90 to 90)
    longitude NUMERIC(11, 8), -- Geographic longitude (-180 to 180)
    address TEXT, -- Street address
    city TEXT, -- City name
    state TEXT, -- State/province name
    country TEXT, -- Country name
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

comment on table public.locations is 'Stores information about locations referenced in the dataset. Supports aliases and geographic coordinates.';
comment on column public.locations.name is 'Primary name of the location';
comment on column public.locations.aliases is 'Array of alternative names or ways this location may be referenced';
comment on column public.locations.latitude is 'Geographic latitude in decimal degrees (-90 to 90)';
comment on column public.locations.longitude is 'Geographic longitude in decimal degrees (-180 to 180)';

-- Indexes for locations
create index if not exists idx_locations_name on public.locations(name);
create index if not exists idx_locations_aliases on public.locations using gin(aliases);
create index if not exists idx_locations_city on public.locations(city);
create index if not exists idx_locations_state on public.locations(state);
create index if not exists idx_locations_country on public.locations(country);
create index if not exists idx_locations_coordinates on public.locations(latitude, longitude) where latitude is not null and longitude is not null;
create index if not exists idx_locations_created_at on public.locations(created_at);

-- Full-text search index for name
create index if not exists idx_locations_name_fts on public.locations 
    USING gin(to_tsvector('english', COALESCE(name, '')));

-- Trigger for updated_at
create trigger update_locations_updated_at
  before update on public.locations
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.locations enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.locations to anon, service_role, supabase_admin;
grant all on public.locations to supabase_admin;

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================
-- Stores information about companies referenced in the dataset
create table if not exists public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Primary name of the company
    aliases TEXT[] DEFAULT '{}'::text[], -- Array of alternative names/references (e.g., "Apple Inc." for "Apple")
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

comment on table public.companies is 'Stores information about companies referenced in the dataset. Supports aliases for alternative naming conventions (e.g., "Apple" vs "Apple Inc.").';
comment on column public.companies.name is 'Primary name of the company';
comment on column public.companies.aliases is 'Array of alternative names or ways this company may be referenced (e.g., "Apple Inc.", "Apple Computer")';

-- Indexes for companies
create index if not exists idx_companies_name on public.companies(name);
create index if not exists idx_companies_aliases on public.companies using gin(aliases);
create index if not exists idx_companies_created_at on public.companies(created_at);

-- Full-text search index for name
create index if not exists idx_companies_name_fts on public.companies 
    USING gin(to_tsvector('english', COALESCE(name, '')));

-- Trigger for updated_at
create trigger update_companies_updated_at
  before update on public.companies
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.companies enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.companies to anon, service_role, supabase_admin;
grant all on public.companies to supabase_admin;

-- ============================================================================
-- PROGRAMS TABLE
-- ============================================================================
-- Stores information about programs referenced in the dataset
create table if not exists public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Primary name of the program
    aliases TEXT[] DEFAULT '{}'::text[], -- Array of alternative names/references
    description TEXT, -- Optional description of the program
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

comment on table public.programs is 'Stores information about programs referenced in the dataset. Supports aliases for alternative naming conventions.';
comment on column public.programs.name is 'Primary name of the program';
comment on column public.programs.aliases is 'Array of alternative names or ways this program may be referenced';
comment on column public.programs.description is 'Optional description or details about the program';

-- Indexes for programs
create index if not exists idx_programs_name on public.programs(name);
create index if not exists idx_programs_aliases on public.programs using gin(aliases);
create index if not exists idx_programs_created_at on public.programs(created_at);

-- Full-text search index for name and description
create index if not exists idx_programs_name_fts on public.programs 
    USING gin(to_tsvector('english', COALESCE(name, '')));
create index if not exists idx_programs_description_fts on public.programs 
    USING gin(to_tsvector('english', COALESCE(description, ''))) where description is not null;

-- Trigger for updated_at
create trigger update_programs_updated_at
  before update on public.programs
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.programs enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.programs to anon, service_role, supabase_admin;
grant all on public.programs to supabase_admin;
