#!/usr/bin/env node

/**
 * Database Verification Script
 * 
 * Verifies that all required database roles, tables, and schemas exist.
 * This helps diagnose if initialization scripts ran correctly.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pg from 'pg';

const { Client } = pg;

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
config({ path: resolve(projectRoot, '.env.local') });

const requiredRoles = ['anon', 'service_role', 'supabase_admin'];
const requiredTables = [
  'original_uploads',
  'nuforc_parsed',
  'udb_parsed',
  'audio_parsed',
  'normalized_data',
  'scraped_pages',
];
const requiredExtensions = ['uuid-ossp'];

async function main() {
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  const postgresHost = process.env.POSTGRES_HOST || 'localhost';
  const postgresPort = parseInt(process.env.POSTGRES_PORT || '54325', 10);
  const postgresUser = process.env.POSTGRES_USER || 'postgres';
  const postgresDb = process.env.POSTGRES_DB || 'postgres';

  if (!postgresPassword) {
    console.error('❌ POSTGRES_PASSWORD not found in .env.local');
    console.error('   Please run: npm run setup-supabase');
    process.exit(1);
  }

  const client = new Client({
    host: postgresHost,
    port: postgresPort,
    database: postgresDb,
    user: postgresUser,
    password: postgresPassword,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Check roles
    console.log('Checking database roles...');
    const { rows: roles } = await client.query(`
      SELECT rolname 
      FROM pg_catalog.pg_roles 
      WHERE rolname IN (${requiredRoles.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY rolname
    `, requiredRoles);

    const foundRoles = roles.map(r => r.rolname);
    const missingRoles = requiredRoles.filter(r => !foundRoles.includes(r));

    if (missingRoles.length === 0) {
      console.log('  ✅ All required roles exist:');
      foundRoles.forEach(role => console.log(`     - ${role}`));
    } else {
      console.log('  ❌ Missing roles:');
      missingRoles.forEach(role => console.log(`     - ${role}`));
      console.log('\n  💡 Run: npm run create-supabase-roles');
    }
    console.log('');

    // Check extensions
    console.log('Checking database extensions...');
    const { rows: extensions } = await client.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN (${requiredExtensions.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY extname
    `, requiredExtensions);

    const foundExtensions = extensions.map(e => e.extname);
    const missingExtensions = requiredExtensions.filter(e => !foundExtensions.includes(e));

    if (missingExtensions.length === 0) {
      console.log('  ✅ All required extensions exist:');
      foundExtensions.forEach(ext => console.log(`     - ${ext}`));
    } else {
      console.log('  ⚠️  Missing extensions:');
      missingExtensions.forEach(ext => console.log(`     - ${ext}`));
      console.log('  💡 Extensions will be created automatically by migrations');
    }
    console.log('');

    // Check tables
    console.log('Checking database tables...');
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (${requiredTables.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY table_name
    `, requiredTables);

    const foundTables = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(t => !foundTables.includes(t));

    if (missingTables.length === 0) {
      console.log('  ✅ All required tables exist:');
      foundTables.forEach(table => console.log(`     - ${table}`));
    } else {
      console.log('  ❌ Missing tables:');
      missingTables.forEach(table => console.log(`     - ${table}`));
      console.log('\n  💡 Run: npm run run-supabase-migrations');
      console.log('     Or: npm run create-tables-directly');
    }
    console.log('');

    // Check table row counts
    if (foundTables.length > 0) {
      console.log('Table row counts:');
      for (const table of foundTables) {
        try {
          const { rows: count } = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`  ${table}: ${count[0].count} rows`);
        } catch (error) {
          console.log(`  ${table}: Error reading count`);
        }
      }
      console.log('');
    }

    // Summary
    const allGood = missingRoles.length === 0 && missingTables.length === 0;
    
    if (allGood) {
      console.log('✅ Database is properly initialized!\n');
      console.log('All required roles, extensions, and tables exist.');
    } else {
      console.log('⚠️  Database initialization incomplete.\n');
      console.log('Next steps:');
      if (missingRoles.length > 0) {
        console.log('  1. Create roles: npm run create-supabase-roles');
      }
      if (missingTables.length > 0) {
        console.log('  2. Run migrations: npm run run-supabase-migrations');
      }
      console.log('\nOr reset and start fresh:');
      console.log('  npm run reset-supabase');
      console.log('  npm run setup-supabase -- --cleanup');
      console.log('  npm run supabase:start');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to PostgreSQL');
      console.error('   Make sure Supabase is running: npm run supabase:start');
      console.error(`   Trying to connect to: ${postgresHost}:${postgresPort}`);
    } else if (error.code === '28P01') {
      console.error('❌ Authentication failed');
      console.error('   Check your POSTGRES_PASSWORD in .env.local');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

