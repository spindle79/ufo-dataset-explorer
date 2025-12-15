-- Create required roles for Supabase
-- This must run before other migrations

-- Create anon role (anonymous/public access)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    create role anon NOLOGIN NOINHERIT;
    grant anon TO postgres;
  END IF;
END
$$;

-- Create service_role role (full access, bypasses RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    create role service_role NOLOGIN NOINHERIT BYPASSRLS;
    grant service_role TO postgres;
  END IF;
END
$$;

-- Create supabase_admin role (used by Supabase tooling)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    create role supabase_admin NOLOGIN NOINHERIT CREATEDB CREATEROLE REPLICATION BYPASSRLS;
    grant supabase_admin TO postgres;
  END IF;
END
$$;

-- Create authenticated role (used by GoTrue for authenticated users)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    create role authenticated NOLOGIN NOINHERIT;
    grant authenticated TO postgres;
  END IF;
END
$$;

-- Grant necessary permissions
grant USAGE ON SCHEMA public TO anon, authenticated, service_role, supabase_admin;
grant ALL ON SCHEMA public TO service_role, supabase_admin;

-- Grant permissions on all existing tables
grant SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, supabase_admin;
grant ALL ON ALL TABLES IN SCHEMA public TO supabase_admin;
grant USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, supabase_admin;
grant ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;

-- Set default privileges for future tables
alter default privileges IN SCHEMA public grant SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role, supabase_admin;
alter default privileges IN SCHEMA public grant ALL ON TABLES TO supabase_admin;
alter default privileges IN SCHEMA public grant USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role, supabase_admin;
alter default privileges IN SCHEMA public grant ALL ON SEQUENCES TO supabase_admin;

comment on role anon IS 'Anonymous role for public API access';
comment on role authenticated IS 'Authenticated role for logged-in users';
comment on role service_role IS 'Service role with full access, bypasses RLS';
comment on role supabase_admin IS 'Supabase admin role for tooling and migrations';

