-- Create auth schema for GoTrue
-- This must run before GoTrue migrations

create schema IF NOT EXISTS auth;

-- Grant necessary permissions to postgres user
grant ALL ON SCHEMA auth TO postgres;
grant USAGE ON SCHEMA auth TO anon, service_role;

-- Set default privileges for auth schema
alter default privileges IN SCHEMA auth grant ALL ON TABLES TO postgres;
alter default privileges IN SCHEMA auth grant SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
alter default privileges IN SCHEMA auth grant USAGE, SELECT ON SEQUENCES TO postgres, service_role;

comment on schema auth IS 'Auth schema for GoTrue authentication service';

