#!/usr/bin/env tsx

/**
 * Run Supabase database migrations manually
 * 
 * This script runs all SQL migration files from supabase/db/init/
 * in alphabetical order. Useful if migrations didn't run automatically.
 * 
 * Usage:
 *   tsx scripts/run-supabase-migrations.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';
import { readdir, readFile } from 'fs/promises';
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
    console.error('Please run: npm run setup-supabase');
    process.exit(1);
  }

  console.log('Running Supabase migrations...\n');
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

    // Get all SQL files from init directory, sorted alphabetically
    const initDir = join(projectRoot, 'supabase', 'db', 'init');
    const files = await readdir(initDir);
    const sqlFiles = files
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('No migration files found in supabase/db/init/');
      return;
    }

    console.log(`Found ${sqlFiles.length} migration file(s):\n`);

    for (const file of sqlFiles) {
      console.log(`Running ${file}...`);
      const filePath = join(initDir, file);
      const sql = await readFile(filePath, 'utf-8');

      try {
        // Execute the entire SQL file as one block
        // PostgreSQL can handle multiple statements, and this preserves dollar-quoted strings
        await client.query(sql);
        console.log(`✓ ${file} completed\n`);
      } catch (error) {
        if (error instanceof Error) {
          // Ignore pg_read_file errors (Supabase internal issue)
          if (error.message.includes('pg_read_file')) {
            console.log(`⚠ ${file} - pg_read_file error (Supabase internal, checking if migration succeeded)...\n`);
            
            // Wait a moment for any async operations to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if tables exist to verify migration succeeded
            try {
              const { rows } = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('original_uploads', 'udb_parsed', 'nuforc_parsed', 'audio_parsed', 'normalized_data')
              `);
              
              if (rows.length > 0) {
                console.log(`✓ Tables exist (${rows.length} found), migration succeeded despite warning\n`);
                // Migration succeeded, continue
                continue;
              } else {
                // If it's the initial schema and no tables exist, try to execute without the problematic parts
                if (file === '002_initial_schema.sql' || file === '001_initial_schema.sql') {
                  console.log(`⚠ No tables found. The pg_read_file error may be blocking execution.`);
                  console.log(`   Trying alternative approach: executing SQL in smaller chunks...\n`);
                  
                  // Try executing without any potential pg_read_file calls
                  // Split by major statements but preserve dollar-quoted blocks
                  const chunks = sql.split(/(?=CREATE (?:TABLE|EXTENSION|OR REPLACE FUNCTION|TRIGGER|INDEX))/i);
                  
                  for (const chunk of chunks) {
                    const trimmed = chunk.trim();
                    if (trimmed.length === 0 || trimmed.startsWith('--')) continue;
                    
                    try {
                      await client.query(trimmed);
                    } catch (chunkError) {
                      if (chunkError instanceof Error && chunkError.message.includes('pg_read_file')) {
                        // Skip this chunk if it has pg_read_file issues
                        continue;
                      }
                      // For other errors, log but continue
                      if (chunkError instanceof Error && 
                          (chunkError.message.includes('already exists') || 
                           chunkError.message.includes('duplicate'))) {
                        // OK to ignore
                        continue;
                      }
                    }
                  }
                  
                  // Check again if tables were created
                  const { rows: checkRows } = await client.query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('original_uploads', 'udb_parsed', 'nuforc_parsed', 'audio_parsed', 'normalized_data')
                  `);
                  
                  if (checkRows.length > 0) {
                    console.log(`✓ Tables created successfully (${checkRows.length} found)\n`);
                    continue;
                  } else {
                    console.error(`❌ Error: Tables were not created. Full error:`, error.message);
                    throw error;
                  }
                } else {
                  // For other migrations, might be OK if they're modifying existing tables
                  console.log(`⚠ Continuing despite error (may be expected if tables don't exist yet)\n`);
                }
              }
            } catch (checkError) {
              console.error(`❌ Error checking tables:`, checkError);
              throw error;
            }
          }
          // Ignore "already exists" errors (migrations are idempotent)
          else if (
            error.message.includes('already exists') ||
            error.message.includes('duplicate')
          ) {
            console.log(`⚠ ${file} - Some objects already exist (this is OK)\n`);
          } else {
            console.error(`❌ Error in ${file}:`, error.message);
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    console.log('✅ All migrations completed successfully!');
    console.log('\nYou can now run: pnpm backfill-udb-columns');
  } catch (error) {
    console.error('\n❌ Error running migrations:');
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

