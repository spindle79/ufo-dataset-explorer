-- ============================================================================
-- AI GENERATIONS TABLE
-- ============================================================================
-- Stores AI-generated content (transcripts, documents, etc.) with versioning
-- Supports multiple generations per source item (audio, pdf, etc.)
-- Allows browsing and switching between different versions
create table if not exists public.ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL, -- Type of source: 'audio', 'pdf', etc.
    source_id TEXT NOT NULL, -- ID of the source item (e.g., audio file ID)
    generation_type TEXT NOT NULL, -- Type of generation: 'transcript', 'summary', 'document', etc.
    version INTEGER NOT NULL DEFAULT 1, -- Version number for this generation
    text_content TEXT, -- Main text content (transcript, summary, etc.)
    documents JSONB DEFAULT '{}'::jsonb, -- Generated documents if applicable
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (model used, parameters, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure unique version per source
    UNIQUE(source_type, source_id, generation_type, version)
);

comment on table public.ai_generations is 'Stores AI-generated content with versioning support. Allows multiple versions of transcripts, summaries, or other AI-generated content per source item.';

-- Indexes for ai_generations
create index if not exists idx_ai_generations_source on public.ai_generations(source_type, source_id);
create index if not exists idx_ai_generations_type on public.ai_generations(generation_type);
create index if not exists idx_ai_generations_version on public.ai_generations(source_type, source_id, generation_type, version);
create index if not exists idx_ai_generations_created_at on public.ai_generations(created_at);
create index if not exists idx_ai_generations_metadata on public.ai_generations using gin(metadata);
create index if not exists idx_ai_generations_documents on public.ai_generations using gin(documents);

-- Trigger for updated_at
create trigger update_ai_generations_updated_at
  before update on public.ai_generations
  for each row
  execute function public.update_updated_at_column();

-- Enable Row Level Security (required for all tables)
alter table public.ai_generations enable row level security;

-- RLS Policies for ai_generations
-- Select policy for anon users (public read access)
create policy "anon_select_ai_generations"
  on public.ai_generations
  for select
  to anon
  using (true);

-- Select policy for authenticated users
create policy "authenticated_select_ai_generations"
  on public.ai_generations
  for select
  to authenticated
  using (true);

-- Insert policy for anon users (public write access)
create policy "anon_insert_ai_generations"
  on public.ai_generations
  for insert
  to anon
  with check (true);

-- Insert policy for authenticated users
create policy "authenticated_insert_ai_generations"
  on public.ai_generations
  for insert
  to authenticated
  with check (true);

-- Update policy for anon users (public update access)
create policy "anon_update_ai_generations"
  on public.ai_generations
  for update
  to anon
  using (true)
  with check (true);

-- Update policy for authenticated users
create policy "authenticated_update_ai_generations"
  on public.ai_generations
  for update
  to authenticated
  using (true)
  with check (true);

-- Delete policy for anon users (public delete access)
create policy "anon_delete_ai_generations"
  on public.ai_generations
  for delete
  to anon
  using (true);

-- Delete policy for authenticated users
create policy "authenticated_delete_ai_generations"
  on public.ai_generations
  for delete
  to authenticated
  using (true);

-- Grant permissions for PostgREST access
grant select, insert, update, delete on public.ai_generations to anon, service_role, supabase_admin;
grant all on public.ai_generations to supabase_admin;

