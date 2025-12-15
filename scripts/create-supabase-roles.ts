#!/usr/bin/env tsx

/**
 * Create required PostgreSQL roles for Supabase
 * 
 * This script creates the 'anon' and 'service_role' roles in PostgreSQL
 * if they don't exist. These roles are required for Supabase to work properly.
 * 
 * Usage:
 *   tsx scripts/create-supabase-roles.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

/**
 * Main function
 */
async function main() {
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  const postgresHost = process.env.POSTGRES_HOST || 'localhost';
  const postgresPort = parseInt(process.env.POSTGRES_PORT || '54325', 10);
  const postgresDatabase = process.env.POSTGRES_DB || 'postgres';
  const postgresUser = process.env.POSTGRES_USER || 'postgres';

  if (!postgresPassword) {
    console.error('❌ POSTGRES_PASSWORD is not set in .env.local');
    console.error('Please run: npm run setup-supabase');
    process.exit(1);
  }

  console.log('Creating Supabase roles in PostgreSQL...\n');
  console.log(`Connecting to: ${postgresHost}:${postgresPort}/${postgresDatabase}`);

  const client = new Client({
    host: postgresHost,
    port: postgresPort,
    database: postgresDatabase,
    user: postgresUser,
    password: postgresPassword,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL\n');

    // Create anon role
    console.log('Creating anon role...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN NOINHERIT;
          GRANT anon TO postgres;
          RAISE NOTICE 'Created role anon';
        ELSE
          RAISE NOTICE 'Role anon already exists';
        END IF;
      END
      $$;
    `);
    console.log('✓ anon role ready\n');

    // Create service_role
    console.log('Creating service_role...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
          GRANT service_role TO postgres;
          RAISE NOTICE 'Created role service_role';
        ELSE
          RAISE NOTICE 'Role service_role already exists';
        END IF;
      END
      $$;
    `);
    console.log('✓ service_role ready\n');

    // Create supabase_admin
    console.log('Creating supabase_admin...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
          CREATE ROLE supabase_admin NOLOGIN NOINHERIT CREATEDB CREATEROLE REPLICATION BYPASSRLS;
          GRANT supabase_admin TO postgres;
          RAISE NOTICE 'Created role supabase_admin';
        ELSE
          RAISE NOTICE 'Role supabase_admin already exists';
        END IF;
      END
      $$;
    `);
    console.log('✓ supabase_admin ready\n');

    // Grant permissions
    console.log('Granting permissions...');
    await client.query(`
      GRANT USAGE ON SCHEMA public TO anon, service_role, supabase_admin;
      GRANT ALL ON SCHEMA public TO service_role, supabase_admin;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, service_role, supabase_admin;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_admin;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, service_role, supabase_admin;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, service_role, supabase_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, service_role, supabase_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_admin;
    `);
    console.log('✓ Permissions granted\n');

    console.log('✅ Supabase roles created successfully!');
    console.log('\nYou can now run: pnpm backfill-udb-columns');
  } catch (error) {
    console.error('\n❌ Error creating roles:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Error:', JSON.stringify(error, null, 2));
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

