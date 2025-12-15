-- Migration: Enable Row Level Security Policies
-- Purpose: Add RLS policies for all tables to comply with Supabase best practices
-- All tables are intended for public access, so policies return true for all operations

-- ============================================================================
-- ORIGINAL_UPLOADS TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from original_uploads
create policy "original_uploads_select_anon" on public.original_uploads
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from original_uploads
create policy "original_uploads_select_authenticated" on public.original_uploads
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into original_uploads
create policy "original_uploads_insert_anon" on public.original_uploads
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into original_uploads
create policy "original_uploads_insert_authenticated" on public.original_uploads
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update original_uploads
create policy "original_uploads_update_anon" on public.original_uploads
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update original_uploads
create policy "original_uploads_update_authenticated" on public.original_uploads
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from original_uploads
create policy "original_uploads_delete_anon" on public.original_uploads
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from original_uploads
create policy "original_uploads_delete_authenticated" on public.original_uploads
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- NUFORC_PARSED TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from nuforc_parsed
create policy "nuforc_parsed_select_anon" on public.nuforc_parsed
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from nuforc_parsed
create policy "nuforc_parsed_select_authenticated" on public.nuforc_parsed
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into nuforc_parsed
create policy "nuforc_parsed_insert_anon" on public.nuforc_parsed
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into nuforc_parsed
create policy "nuforc_parsed_insert_authenticated" on public.nuforc_parsed
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update nuforc_parsed
create policy "nuforc_parsed_update_anon" on public.nuforc_parsed
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update nuforc_parsed
create policy "nuforc_parsed_update_authenticated" on public.nuforc_parsed
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from nuforc_parsed
create policy "nuforc_parsed_delete_anon" on public.nuforc_parsed
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from nuforc_parsed
create policy "nuforc_parsed_delete_authenticated" on public.nuforc_parsed
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- UDB_PARSED TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from udb_parsed
create policy "udb_parsed_select_anon" on public.udb_parsed
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from udb_parsed
create policy "udb_parsed_select_authenticated" on public.udb_parsed
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into udb_parsed
create policy "udb_parsed_insert_anon" on public.udb_parsed
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into udb_parsed
create policy "udb_parsed_insert_authenticated" on public.udb_parsed
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update udb_parsed
create policy "udb_parsed_update_anon" on public.udb_parsed
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update udb_parsed
create policy "udb_parsed_update_authenticated" on public.udb_parsed
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from udb_parsed
create policy "udb_parsed_delete_anon" on public.udb_parsed
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from udb_parsed
create policy "udb_parsed_delete_authenticated" on public.udb_parsed
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- AUDIO_PARSED TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from audio_parsed
create policy "audio_parsed_select_anon" on public.audio_parsed
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from audio_parsed
create policy "audio_parsed_select_authenticated" on public.audio_parsed
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into audio_parsed
create policy "audio_parsed_insert_anon" on public.audio_parsed
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into audio_parsed
create policy "audio_parsed_insert_authenticated" on public.audio_parsed
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update audio_parsed
create policy "audio_parsed_update_anon" on public.audio_parsed
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update audio_parsed
create policy "audio_parsed_update_authenticated" on public.audio_parsed
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from audio_parsed
create policy "audio_parsed_delete_anon" on public.audio_parsed
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from audio_parsed
create policy "audio_parsed_delete_authenticated" on public.audio_parsed
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- NORMALIZED_DATA TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from normalized_data
create policy "normalized_data_select_anon" on public.normalized_data
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from normalized_data
create policy "normalized_data_select_authenticated" on public.normalized_data
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into normalized_data
create policy "normalized_data_insert_anon" on public.normalized_data
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into normalized_data
create policy "normalized_data_insert_authenticated" on public.normalized_data
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update normalized_data
create policy "normalized_data_update_anon" on public.normalized_data
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update normalized_data
create policy "normalized_data_update_authenticated" on public.normalized_data
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from normalized_data
create policy "normalized_data_delete_anon" on public.normalized_data
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from normalized_data
create policy "normalized_data_delete_authenticated" on public.normalized_data
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- SCRAPED_PAGES TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from scraped_pages
create policy "scraped_pages_select_anon" on public.scraped_pages
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from scraped_pages
create policy "scraped_pages_select_authenticated" on public.scraped_pages
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into scraped_pages
create policy "scraped_pages_insert_anon" on public.scraped_pages
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into scraped_pages
create policy "scraped_pages_insert_authenticated" on public.scraped_pages
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update scraped_pages
create policy "scraped_pages_update_anon" on public.scraped_pages
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update scraped_pages
create policy "scraped_pages_update_authenticated" on public.scraped_pages
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from scraped_pages
create policy "scraped_pages_delete_anon" on public.scraped_pages
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from scraped_pages
create policy "scraped_pages_delete_authenticated" on public.scraped_pages
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- PEOPLE TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from people
create policy "people_select_anon" on public.people
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from people
create policy "people_select_authenticated" on public.people
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into people
create policy "people_insert_anon" on public.people
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into people
create policy "people_insert_authenticated" on public.people
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update people
create policy "people_update_anon" on public.people
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update people
create policy "people_update_authenticated" on public.people
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from people
create policy "people_delete_anon" on public.people
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from people
create policy "people_delete_authenticated" on public.people
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- LOCATIONS TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from locations
create policy "locations_select_anon" on public.locations
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from locations
create policy "locations_select_authenticated" on public.locations
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into locations
create policy "locations_insert_anon" on public.locations
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into locations
create policy "locations_insert_authenticated" on public.locations
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update locations
create policy "locations_update_anon" on public.locations
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update locations
create policy "locations_update_authenticated" on public.locations
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from locations
create policy "locations_delete_anon" on public.locations
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from locations
create policy "locations_delete_authenticated" on public.locations
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from companies
create policy "companies_select_anon" on public.companies
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from companies
create policy "companies_select_authenticated" on public.companies
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into companies
create policy "companies_insert_anon" on public.companies
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into companies
create policy "companies_insert_authenticated" on public.companies
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update companies
create policy "companies_update_anon" on public.companies
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update companies
create policy "companies_update_authenticated" on public.companies
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from companies
create policy "companies_delete_anon" on public.companies
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from companies
create policy "companies_delete_authenticated" on public.companies
  for delete
  to authenticated
  using ( true );

-- ============================================================================
-- PROGRAMS TABLE POLICIES
-- ============================================================================

-- Allow anonymous users to select from programs
create policy "programs_select_anon" on public.programs
  for select
  to anon
  using ( true );

-- Allow authenticated users to select from programs
create policy "programs_select_authenticated" on public.programs
  for select
  to authenticated
  using ( true );

-- Allow anonymous users to insert into programs
create policy "programs_insert_anon" on public.programs
  for insert
  to anon
  with check ( true );

-- Allow authenticated users to insert into programs
create policy "programs_insert_authenticated" on public.programs
  for insert
  to authenticated
  with check ( true );

-- Allow anonymous users to update programs
create policy "programs_update_anon" on public.programs
  for update
  to anon
  using ( true )
  with check ( true );

-- Allow authenticated users to update programs
create policy "programs_update_authenticated" on public.programs
  for update
  to authenticated
  using ( true )
  with check ( true );

-- Allow anonymous users to delete from programs
create policy "programs_delete_anon" on public.programs
  for delete
  to anon
  using ( true );

-- Allow authenticated users to delete from programs
create policy "programs_delete_authenticated" on public.programs
  for delete
  to authenticated
  using ( true );

