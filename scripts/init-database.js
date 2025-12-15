#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script waits for the database to be ready, then runs all migrations.
 * It's designed to be run after starting Supabase services.
 * 
 * Usage:
 *   npm run init-database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import pg from 'pg';

const { Client } = pg;
const execAsync = promisify(exec);

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
config({ path: resolve(projectRoot, '.env.local') });

/**
 * Wait for database to be ready
 */
async function waitForDatabase(maxAttempts = 30, delayMs = 2000) {
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  const postgresHost = process.env.POSTGRES_HOST || 'localhost';
  const postgresPort = parseInt(process.env.POSTGRES_PORT || '54325', 10);
  const postgresUser = process.env.POSTGRES_USER || 'postgres';
  const postgresDb = process.env.POSTGRES_DB || 'postgres';

  if (!postgresPassword) {
    throw new Error('POSTGRES_PASSWORD not found in .env.local');
  }

  console.log('Waiting for database to be ready...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = new Client({
      host: postgresHost,
      port: postgresPort,
      database: postgresDb,
      user: postgresUser,
      password: postgresPassword,
      connectionTimeoutMillis: 2000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('✅ Database is ready!\n');
      return true;
    } catch (error) {
      if (attempt < maxAttempts) {
        process.stdout.write(`  Attempt ${attempt}/${maxAttempts}...\r`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`Database not ready after ${maxAttempts} attempts`);
      }
    }
  }
}

/**
 * Run migrations using the existing script
 */
async function runMigrations() {
  console.log('Running database migrations...\n');
  
  try {
    const { stdout, stderr } = await execAsync('npm run run-supabase-migrations', {
      cwd: projectRoot,
      env: { ...process.env },
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) console.error(stderr);
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

/**
 * Setup storage buckets
 */
async function setupStorageBuckets() {
  console.log('Setting up storage buckets...\n');
  
  try {
    const { stdout, stderr } = await execAsync('npm run setup-storage-buckets', {
      cwd: projectRoot,
      env: { ...process.env },
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) console.error(stderr);
    
    return true;
  } catch (error) {
    console.error('Storage bucket setup failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Initializing Supabase database...\n');

  try {
    // Wait for database
    await waitForDatabase();
    
    // Run migrations
    await runMigrations();
    
    // Setup storage buckets (after migrations so storage schema exists)
    await setupStorageBuckets();
    
    console.log('\n✅ Database initialization complete!\n');
    console.log('Verify with: npm run verify-database');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Supabase is running: npm run supabase:start');
    console.error('  2. Wait 30-60 seconds for services to start');
    console.error('  3. Check logs: npm run supabase:logs');
    console.error('  4. Try running migrations manually: npm run run-supabase-migrations');
    console.error('  5. Try setting up buckets manually: npm run setup-storage-buckets');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

