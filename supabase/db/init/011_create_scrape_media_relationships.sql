-- Migration: Create relationship table between scraped pages and media files
-- This enables tracking which audio/PDF files were discovered from which scraped pages
-- and allows proper foreign key relationships

-- ============================================================================
-- SCRAPED PAGE MEDIA RELATIONSHIPS TABLE
-- ============================================================================
-- Many-to-many relationship between scraped_pages and original_uploads
-- Tracks which media files (audio, PDF) were discovered from which scraped pages
create table if not exists public.scraped_page_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scraped_page_id UUID NOT NULL REFERENCES public.scraped_pages(id) ON DELETE CASCADE,
    original_upload_id UUID NOT NULL REFERENCES public.original_uploads(id) ON DELETE CASCADE,
    link_text TEXT, -- Text content of the link (if available)
    link_alt TEXT, -- Alt text for images (if available)
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique relationship (same page can't link to same file twice)
    UNIQUE(scraped_page_id, original_upload_id)
);

-- Indexes for efficient lookups
create index if not exists idx_scraped_page_media_page_id 
  on public.scraped_page_media(scraped_page_id);

create index if not exists idx_scraped_page_media_upload_id 
  on public.scraped_page_media(original_upload_id);

create index if not exists idx_scraped_page_media_discovered_at 
  on public.scraped_page_media(discovered_at);

-- Trigger for updated_at
create trigger update_scraped_page_media_updated_at
  before update on public.scraped_page_media
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security
alter table public.scraped_page_media enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.scraped_page_media to anon, service_role, supabase_admin;
grant all on public.scraped_page_media to supabase_admin;

-- Comments
comment on table public.scraped_page_media is 'Many-to-many relationship between scraped pages and media files (audio, PDF)';
comment on column public.scraped_page_media.scraped_page_id is 'Reference to the scraped page where the media was discovered';
comment on column public.scraped_page_media.original_upload_id is 'Reference to the media file (audio or PDF)';
comment on column public.scraped_page_media.discovered_at is 'When the media file was first discovered from this scraped page';

-- ============================================================================
-- UPDATE ORIGINAL_UPLOADS STATUS VALUES
-- ============================================================================
-- Add 'discovered' status for files that are known but not yet fetched/processed
-- This allows tracking files that were found during scraping but not yet downloaded

-- Note: We'll handle this in application code, but document the status flow:
-- 'discovered' -> File URL found during scraping, record created, not yet fetched
-- 'pending' -> File fetched/uploaded, ready for processing
-- 'processing' -> Currently being processed (transcription, parsing, etc.)
-- 'parsed' -> Successfully processed
-- 'error' -> Processing failed

-- We could add a CHECK constraint, but it's better to handle in application code
-- for flexibility. The status field already supports these values.
