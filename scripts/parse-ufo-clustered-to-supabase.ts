#!/usr/bin/env tsx

/**
 * Parse UFO Clustered JSONL file into Supabase
 * 
 * This script:
 * 1. Reads the JSONL file from data/cjc0013_ufo_clustered/raw/ufo_data_clustered.jsonl
 * 2. Parses each line as JSON
 * 3. Inserts records into the ufo_clustered_parsed table
 * 4. Handles batching and error recovery
 * 
 * Usage:
 *   tsx scripts/parse-ufo-clustered-to-supabase.ts [options]
 *   npm run parse-ufo-clustered-to-supabase [options]
 * 
 * Options:
 *   --batch-size <number>    Number of records to process per batch (default: 1000)
 *   --max-records <number>   Maximum total records to process (default: all)
 *   --skip-existing          Skip records that already exist in database
 *   --start-line <number>    Start from line number (1-based, for resuming)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createAdminClient } from '../app/lib/supabase/server';
import type { UfoClusteredParsedCreate } from '../app/lib/supabase-types';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

// Configuration
const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_MAX_RECORDS = null; // null means process all
const JSONL_FILE_PATH = resolve(__dirname, '..', 'data', 'cjc0013_ufo_clustered', 'raw', 'ufo_data_clustered.jsonl');

interface Config {
  batchSize: number;
  maxRecords: number | null;
  skipExisting: boolean;
  startLine: number;
}

// Parse command line arguments
function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    batchSize: DEFAULT_BATCH_SIZE,
    maxRecords: DEFAULT_MAX_RECORDS,
    skipExisting: false,
    startLine: 1,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--batch-size':
        config.batchSize = parseInt(args[++i], 10);
        break;
      case '--max-records':
        config.maxRecords = parseInt(args[++i], 10);
        break;
      case '--skip-existing':
        config.skipExisting = true;
        break;
      case '--start-line':
        config.startLine = parseInt(args[++i], 10);
        break;
      case '--help':
        console.log(`
Parse UFO Clustered JSONL file into Supabase

Usage:
  tsx scripts/parse-ufo-clustered-to-supabase.ts [options]

Options:
  --batch-size <number>    Number of records per batch (default: ${DEFAULT_BATCH_SIZE})
  --max-records <number>    Maximum total records to process (default: all)
  --skip-existing           Skip records that already exist
  --start-line <number>     Start from line number (1-based, for resuming)
  --help                    Show this help message
        `);
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Get existing UIDs from Supabase
 */
async function getExistingUids(supabase: ReturnType<typeof createAdminClient>, limit = 100000): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('ufo_clustered_parsed')
    .select('uid')
    .limit(limit);

  if (error) {
    console.error('Error fetching existing UIDs:', error);
    return new Set();
  }

  return new Set(data?.map((row) => row.uid) || []);
}

/**
 * Insert UFO clustered records using direct PostgreSQL connection
 */
async function insertUfoClusteredRecordsDirect(
  records: UfoClusteredParsedCreate[],
  existingUids: Set<string> | null
): Promise<{ inserted: number; skipped: number }> {
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  const postgresHost = process.env.POSTGRES_HOST || 'localhost';
  const postgresPort = parseInt(process.env.POSTGRES_PORT || '54325', 10);
  const postgresDatabase = process.env.POSTGRES_DB || 'postgres';
  const postgresUser = process.env.POSTGRES_USER || 'postgres';

  if (!postgresPassword) {
    throw new Error('POSTGRES_PASSWORD is not set in .env.local');
  }

  const client = new Client({
    host: postgresHost,
    port: postgresPort,
    database: postgresDatabase,
    user: postgresUser,
    password: postgresPassword,
  });

  try {
    await client.connect();

    const recordsToInsert: UfoClusteredParsedCreate[] = [];

    for (const record of records) {
      if (existingUids && existingUids.has(record.uid)) {
        continue;
      }
      recordsToInsert.push(record);
    }

    if (recordsToInsert.length === 0) {
      return { inserted: 0, skipped: records.length };
    }

    // Use PostgreSQL INSERT ... ON CONFLICT for upsert
    // Insert records in batches for better performance
    let inserted = 0;
    const batchSize = 100; // Smaller batch size for inserts
    
    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);
      
      for (const record of batch) {
        const columns = ['uid', 'raw_data'];
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = [
          record.uid,
          JSON.stringify(record.raw_data || {}),
        ];

        const query = `
          INSERT INTO public.ufo_clustered_parsed (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (uid) 
          DO UPDATE SET raw_data = EXCLUDED.raw_data::jsonb
        `;

        try {
          await client.query(query, values);
          inserted++;
        } catch (error: any) {
          console.error(`\n❌ Error inserting record uid ${record.uid}:`);
          console.error(`   Error: ${error.message}`);
          console.error(`   Code: ${error.code}`);
          throw error;
        }
      }
    }

    return {
      inserted,
      skipped: records.length - recordsToInsert.length,
    };
  } finally {
    await client.end();
  }
}

/**
 * Parse a single JSONL line into a record
 */
function parseJsonlLine(line: string, lineNumber: number): UfoClusteredParsedCreate | null {
  try {
    const data = JSON.parse(line);
    
    // Validate required fields
    if (!data.uid) {
      console.warn(`⚠️  Line ${lineNumber}: Missing uid field, skipping`);
      return null;
    }

    return {
      uid: data.uid,
      raw_data: data,
    };
  } catch (error) {
    console.warn(`⚠️  Line ${lineNumber}: Failed to parse JSON - ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  const config = parseArgs();

  console.log('Starting UFO Clustered JSONL to Supabase import...');
  console.log('Configuration:', {
    batchSize: config.batchSize,
    maxRecords: config.maxRecords || 'all',
    skipExisting: config.skipExisting,
    startLine: config.startLine,
    jsonlFile: JSONL_FILE_PATH,
  });

  // Check if file exists
  const fs = await import('fs/promises');
  try {
    await fs.access(JSONL_FILE_PATH);
  } catch {
    console.error(`❌ JSONL file not found: ${JSONL_FILE_PATH}`);
    process.exit(1);
  }

  // Initialize Supabase
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error('Failed to initialize Supabase:', (error as Error).message);
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  // Get existing UIDs if skipping
  let existingUids: Set<string> | null = null;
  if (config.skipExisting) {
    console.log('Fetching existing UIDs...');
    existingUids = await getExistingUids(supabase);
    console.log(`Found ${existingUids.size} existing records`);
  }

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let currentLine = 0;
  let batch: UfoClusteredParsedCreate[] = [];

  try {
    // Read file line by line
    const fileStream = createReadStream(JSONL_FILE_PATH);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    console.log('\nProcessing JSONL file...');

    for await (const line of rl) {
      currentLine++;
      
      // Skip lines before start line
      if (currentLine < config.startLine) {
        continue;
      }

      // Check max records limit
      if (config.maxRecords && totalProcessed >= config.maxRecords) {
        console.log(`\nReached max records limit (${config.maxRecords})`);
        break;
      }

      // Parse line
      const record = parseJsonlLine(line.trim(), currentLine);
      if (!record) {
        continue;
      }

      batch.push(record);
      totalProcessed++;

      // Process batch when it reaches batch size
      if (batch.length >= config.batchSize) {
        console.log(`\nProcessing batch (lines ${currentLine - batch.length + 1}-${currentLine}, ${batch.length} records)...`);
        
        const insertResult = await insertUfoClusteredRecordsDirect(
          batch,
          existingUids
        );

        totalInserted += insertResult.inserted;
        totalSkipped += insertResult.skipped;

        console.log(`Inserted: ${insertResult.inserted}, Skipped: ${insertResult.skipped}`);

        // Update existing UIDs set
        if (config.skipExisting && existingUids) {
          batch.forEach((r) => existingUids!.add(r.uid));
        }

        batch = [];

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Progress indicator
      if (totalProcessed % 10000 === 0) {
        console.log(`Progress: ${totalProcessed} records processed...`);
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      console.log(`\nProcessing final batch (${batch.length} records)...`);
      
      const insertResult = await insertUfoClusteredRecordsDirect(
        batch,
        existingUids
      );

      totalInserted += insertResult.inserted;
      totalSkipped += insertResult.skipped;

      console.log(`Inserted: ${insertResult.inserted}, Skipped: ${insertResult.skipped}`);
    }

    console.log('\n=== Import Complete ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped: ${totalSkipped}`);
    console.log(`Last line processed: ${currentLine}`);
  } catch (error) {
    console.error('\nError during import:', error);
    console.error('Stack:', (error as Error).stack);
    console.error(`\nLast successful line: ${currentLine}`);
    console.error('To resume, use: --start-line', currentLine + 1);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

