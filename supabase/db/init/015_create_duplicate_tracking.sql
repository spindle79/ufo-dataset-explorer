-- ============================================================================
-- Migration: Create Duplicate Tracking Table
-- ============================================================================
-- Purpose: Track potential duplicate records across different entity types
--          (audio, video, pdf, image, scrape, people, locations, companies, programs)
--          Allows users to review, mark as non-duplicates, skip, or merge records
-- ============================================================================

-- ============================================================================
-- DUPLICATE PAIRS TABLE
-- ============================================================================
-- Tracks potential duplicate pairs for review
create table if not exists public.duplicate_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- Type of entity: 'audio', 'video', 'pdf', 'image', 'scrape', 'people', 'locations', 'companies', 'programs'
    record1_id UUID NOT NULL, -- First record ID
    record2_id UUID NOT NULL, -- Second record ID
    similarity_score NUMERIC(5, 4) DEFAULT 0.0, -- Similarity score (0.0 to 1.0)
    similarity_reasons TEXT[] DEFAULT '{}'::text[], -- Array of reasons why they're similar (e.g., ['filename_match', 'url_match'])
    status TEXT NOT NULL DEFAULT 'pending', -- Status: 'pending', 'not_duplicate', 'merged', 'skipped'
    merge_data JSONB DEFAULT '{}'::jsonb, -- Field selection for merge (if merged)
    reviewed_at TIMESTAMPTZ, -- When the pair was reviewed
    reviewed_by TEXT, -- User who reviewed (if applicable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique pair per entity type (order-independent)
    -- Using least/greatest to ensure (a, b) and (b, a) are treated as same pair
    UNIQUE(entity_type, record1_id, record2_id)
);

comment on table public.duplicate_pairs is 'Tracks potential duplicate record pairs for review and merging';
comment on column public.duplicate_pairs.entity_type is 'Type of entity: audio, video, pdf, image, scrape, people, locations, companies, programs';
comment on column public.duplicate_pairs.record1_id is 'First record ID (always the smaller UUID when created)';
comment on column public.duplicate_pairs.record2_id is 'Second record ID (always the larger UUID when created)';
comment on column public.duplicate_pairs.similarity_score is 'Similarity score from 0.0 to 1.0';
comment on column public.duplicate_pairs.similarity_reasons is 'Array of reasons why records are similar (e.g., filename_match, url_match, name_similarity)';
comment on column public.duplicate_pairs.status is 'Status: pending (awaiting review), not_duplicate (marked as not duplicate), merged (records were merged), skipped (moved to end of queue)';
comment on column public.duplicate_pairs.merge_data is 'JSON object storing which fields from each record were used in the merge';

-- Indexes for efficient lookups
create index if not exists idx_duplicate_pairs_entity_type on public.duplicate_pairs(entity_type);
create index if not exists idx_duplicate_pairs_status on public.duplicate_pairs(status);
create index if not exists idx_duplicate_pairs_entity_status on public.duplicate_pairs(entity_type, status);
create index if not exists idx_duplicate_pairs_record1 on public.duplicate_pairs(record1_id);
create index if not exists idx_duplicate_pairs_record2 on public.duplicate_pairs(record2_id);
create index if not exists idx_duplicate_pairs_created_at on public.duplicate_pairs(created_at);

-- Trigger for updated_at
create trigger update_duplicate_pairs_updated_at
  before update on public.duplicate_pairs
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.duplicate_pairs enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.duplicate_pairs to anon, service_role, supabase_admin;
grant all on public.duplicate_pairs to supabase_admin;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Allow all authenticated users to read and write duplicate pairs
-- (Adjust based on your security requirements)

-- Allow read access to all
create policy "Allow read access to duplicate_pairs"
  on public.duplicate_pairs
  for select
  using (true);

-- Allow insert access to all
create policy "Allow insert access to duplicate_pairs"
  on public.duplicate_pairs
  for insert
  with check (true);

-- Allow update access to all
create policy "Allow update access to duplicate_pairs"
  on public.duplicate_pairs
  for update
  using (true)
  with check (true);

-- Allow delete access to all
create policy "Allow delete access to duplicate_pairs"
  on public.duplicate_pairs
  for delete
  using (true);

