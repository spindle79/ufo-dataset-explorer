-- Migration: Add canonical_url column and indexes for efficient URL lookups
-- This allows O(log n) database index lookups instead of O(n) scans

-- Add canonical_url column to original_uploads
alter table public.original_uploads
  add column if not exists canonical_url TEXT;

-- Add canonical_url column to scraped_pages
alter table public.scraped_pages
  add column if not exists canonical_url TEXT;

-- Create indexes for efficient lookups
-- Composite index for original_uploads: dataset_type + canonical_url (most common query pattern)
create index if not exists idx_original_uploads_canonical_url 
  on public.original_uploads(canonical_url) 
  where canonical_url is not null;

create index if not exists idx_original_uploads_dataset_canonical 
  on public.original_uploads(dataset_type, canonical_url) 
  where canonical_url is not null;

-- Index for scraped_pages
create index if not exists idx_scraped_pages_canonical_url 
  on public.scraped_pages(canonical_url) 
  where canonical_url is not null;

-- Backfill existing records with canonical URLs
-- Note: This uses a simple normalization - the application code will handle more complex cases
-- For now, we'll set canonical_url = original_url for existing records
-- The application should update these with proper canonicalization on next access

update public.original_uploads
set canonical_url = original_url
where canonical_url is null and original_url is not null;

update public.scraped_pages
set canonical_url = url
where canonical_url is null and url is not null;

-- Add comment
comment on column public.original_uploads.canonical_url is 'Normalized/canonical form of original_url for efficient lookups';
comment on column public.scraped_pages.canonical_url is 'Normalized/canonical form of url for efficient lookups';
