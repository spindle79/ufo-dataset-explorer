#!/usr/bin/env tsx

/**
 * Create database tables directly (bypassing migration file issues)
 * 
 * This script creates all required tables directly in PostgreSQL,
 * useful when migrations fail due to Supabase internal issues.
 * 
 * Usage:
 *   tsx scripts/create-tables-directly.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
config({ path: resolve(projectRoot, '.env.local') });

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
    process.exit(1);
  }

  console.log('Creating database tables directly...\n');
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

    // Read and execute the schema file
    const schemaFile = join(projectRoot, 'supabase', 'db', 'init', '002_initial_schema.sql');
    console.log('Reading schema file...');
    const sql = await readFile(schemaFile, 'utf-8');
    
    // Remove any potential pg_read_file calls or problematic statements
    // Execute the SQL
    console.log('Creating tables...');
    
    // Execute in a transaction to ensure all-or-nothing
    await client.query('BEGIN');
    
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✓ Tables created successfully\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Verify tables were created
    console.log('Verifying tables...');
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('original_uploads', 'udb_parsed', 'nuforc_parsed', 'audio_parsed', 'normalized_data')
      ORDER BY table_name
    `);
    
    if (rows.length === 0) {
      console.error('❌ No tables were created!');
      process.exit(1);
    }
    
    console.log(`✓ Found ${rows.length} table(s):`);
    rows.forEach(row => console.log(`   - ${row.table_name}`));
    console.log('');

    // Now run the second migration for explicit columns
    const explicitColumnsFile = join(projectRoot, 'supabase', 'db', 'init', '003_add_udb_explicit_columns.sql');
    console.log('Adding explicit columns to udb_parsed...');
    const explicitSql = await readFile(explicitColumnsFile, 'utf-8');
    
    await client.query('BEGIN');
    try {
      await client.query(explicitSql);
      await client.query('COMMIT');
      console.log('✓ Explicit columns added\n');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && 
          (error.message.includes('already exists') || 
           error.message.includes('duplicate'))) {
        console.log('⚠ Some columns already exist (this is OK)\n');
      } else {
        throw error;
      }
    }

    console.log('✅ All tables and columns created successfully!');
    console.log('\nYou can now run: pnpm backfill-udb-columns');
  } catch (error) {
    console.error('\n❌ Error creating tables:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      if (error.message.includes('pg_read_file')) {
        console.error('\n💡 Tip: The pg_read_file error is from Supabase internal scripts.');
        console.error('   This script should bypass that issue. If it still fails,');
        console.error('   try restarting Supabase: pnpm supabase:restart');
      }
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

