-- ============================================================================
-- SCRAPED PAGES TABLE
-- ============================================================================
-- Stores scraped web pages with metadata, markdown, and HTML content
-- Content files (markdown and HTML) are stored in Supabase Storage
create table if not exists public.scraped_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    domain TEXT, -- Extracted domain from URL
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    categories TEXT[] DEFAULT '{}'::text[],
    markdown_path TEXT, -- Path to markdown file in Supabase Storage
    html_path TEXT, -- Path to HTML file in Supabase Storage
    file_size BIGINT, -- Size of markdown file in bytes
    error TEXT, -- Error message if scraping failed
    scraped_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

comment on table public.scraped_pages is 'Stores scraped web pages with metadata. Markdown and HTML content are stored in Supabase Storage.';

-- Indexes for scraped_pages
create index if not exists idx_scraped_pages_url on public.scraped_pages(url);
create index if not exists idx_scraped_pages_domain on public.scraped_pages(domain);
create index if not exists idx_scraped_pages_scraped_date on public.scraped_pages(scraped_date);
create index if not exists idx_scraped_pages_title on public.scraped_pages(title);
create index if not exists idx_scraped_pages_categories on public.scraped_pages using gin(categories);
create index if not exists idx_scraped_pages_error on public.scraped_pages(error) where error is not null;

-- Trigger for updated_at
create trigger update_scraped_pages_updated_at
  before update on public.scraped_pages
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
-- Note: RLS policies are defined in 004_enable_rls_policies.sql to match the pattern used by other tables
alter table public.scraped_pages enable row level security;

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.scraped_pages to anon, service_role, supabase_admin;
grant all on public.scraped_pages to supabase_admin;

