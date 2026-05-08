-- ============================================================================
-- Migration: Create Entity Relationship Tables
-- ============================================================================
-- Purpose: Create relationship tables to link entities (people, locations,
--          companies, programs) to the source items they were extracted from
--          (PDF, audio, video, scrape pages). This enables tracking which
--          entities were found in which documents/media.
-- ============================================================================

-- ============================================================================
-- PEOPLE RELATIONSHIPS TABLE
-- ============================================================================
-- Many-to-many relationship between people and source items
-- Tracks which people were extracted from which documents/media
create table if not exists public.people_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- Type of source: 'pdf', 'audio', 'video', 'scrape'
    source_id UUID NOT NULL, -- ID of the source item
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique relationship (same person can't be linked to same source twice)
    UNIQUE(person_id, source_type, source_id)
);

comment on table public.people_relationships is 'Tracks relationships between people and the source items (PDF, audio, video, scrape pages) they were extracted from';
comment on column public.people_relationships.source_type is 'Type of source item: pdf, audio, video, or scrape';
comment on column public.people_relationships.source_id is 'UUID of the source item (references original_uploads.id for pdf/audio/video, scraped_pages.id for scrape)';

-- Indexes for efficient lookups
create index if not exists idx_people_relationships_person_id 
  on public.people_relationships(person_id);
create index if not exists idx_people_relationships_source 
  on public.people_relationships(source_type, source_id);
create index if not exists idx_people_relationships_created_at 
  on public.people_relationships(created_at);

-- Trigger for updated_at
create trigger update_people_relationships_updated_at
  before update on public.people_relationships
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security
alter table public.people_relationships enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.people_relationships to anon, service_role, supabase_admin;
grant all on public.people_relationships to supabase_admin;

-- ============================================================================
-- LOCATIONS RELATIONSHIPS TABLE
-- ============================================================================
create table if not exists public.locations_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(location_id, source_type, source_id)
);

comment on table public.locations_relationships is 'Tracks relationships between locations and the source items they were extracted from';

-- Indexes
create index if not exists idx_locations_relationships_location_id 
  on public.locations_relationships(location_id);
create index if not exists idx_locations_relationships_source 
  on public.locations_relationships(source_type, source_id);
create index if not exists idx_locations_relationships_created_at 
  on public.locations_relationships(created_at);

-- Trigger for updated_at
create trigger update_locations_relationships_updated_at
  before update on public.locations_relationships
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security
alter table public.locations_relationships enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.locations_relationships to anon, service_role, supabase_admin;
grant all on public.locations_relationships to supabase_admin;

-- ============================================================================
-- COMPANIES RELATIONSHIPS TABLE
-- ============================================================================
create table if not exists public.companies_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(company_id, source_type, source_id)
);

comment on table public.companies_relationships is 'Tracks relationships between companies and the source items they were extracted from';

-- Indexes
create index if not exists idx_companies_relationships_company_id 
  on public.companies_relationships(company_id);
create index if not exists idx_companies_relationships_source 
  on public.companies_relationships(source_type, source_id);
create index if not exists idx_companies_relationships_created_at 
  on public.companies_relationships(created_at);

-- Trigger for updated_at
create trigger update_companies_relationships_updated_at
  before update on public.companies_relationships
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security
alter table public.companies_relationships enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.companies_relationships to anon, service_role, supabase_admin;
grant all on public.companies_relationships to supabase_admin;

-- ============================================================================
-- PROGRAMS RELATIONSHIPS TABLE
-- ============================================================================
create table if not exists public.programs_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(program_id, source_type, source_id)
);

comment on table public.programs_relationships is 'Tracks relationships between programs and the source items they were extracted from';

-- Indexes
create index if not exists idx_programs_relationships_program_id 
  on public.programs_relationships(program_id);
create index if not exists idx_programs_relationships_source 
  on public.programs_relationships(source_type, source_id);
create index if not exists idx_programs_relationships_created_at 
  on public.programs_relationships(created_at);

-- Trigger for updated_at
create trigger update_programs_relationships_updated_at
  before update on public.programs_relationships
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security
alter table public.programs_relationships enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.programs_relationships to anon, service_role, supabase_admin;
grant all on public.programs_relationships to supabase_admin;

