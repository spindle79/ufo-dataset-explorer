#!/usr/bin/env tsx

/**
 * Generate seed migration SQL file for UDB dataset from CSV
 * 
 * This script:
 * 1. Reads the CSV file from data/larryhatch/export.csv
 * 2. Parses each row and converts to UDB record format
 * 3. Generates a SQL migration file with INSERT statements
 * 
 * Usage:
 *   tsx scripts/generate-udb-seed-migration.ts
 * 
 * Output:
 *   Creates supabase/db/init/008_seed_udb_data.sql
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
config({ path: resolve(projectRoot, '.env.local') });

const CSV_FILE_PATH = resolve(projectRoot, 'data', 'larryhatch', 'export.csv');
const OUTPUT_FILE_PATH = resolve(projectRoot, 'supabase', 'db', 'init', '008_seed_udb_data.sql');

/**
 * Escape SQL string values
 */
function escapeSqlString(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  const str = String(value);
  // Escape single quotes by doubling them
  const escaped = str.replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Convert CSV row to UDB record format
 */
function csvRowToUdbRecord(row: Record<string, string>): {
  udb_id: number;
  raw_data: Record<string, any>;
} {
  // Parse numeric fields
  const id = parseInt(row.id, 10);
  const year = row.year && row.year.trim() ? parseInt(row.year, 10) : null;
  const month = row.month && row.month.trim() ? parseInt(row.month, 10) : null;
  const day = row.day && row.day.trim() ? parseInt(row.day, 10) : null;
  const longitude = row.longitude && row.longitude.trim() ? parseFloat(row.longitude) : null;
  const latitude = row.latitude && row.latitude.trim() ? parseFloat(row.latitude) : null;
  const strangeness = row.strangeness && row.strangeness.trim() ? parseInt(row.strangeness, 10) : null;
  const credibility = row.credibility && row.credibility.trim() ? parseInt(row.credibility, 10) : null;
  const duration = row.duration && row.duration.trim() ? parseInt(row.duration, 10) : null;
  const elevation = row.elevation && row.elevation.trim() ? (isNaN(parseFloat(row.elevation)) ? row.elevation : parseFloat(row.elevation)) : null;
  const relativeAltitude = row.relativeAltitude && row.relativeAltitude.trim() ? (isNaN(parseFloat(row.relativeAltitude)) ? row.relativeAltitude : parseFloat(row.relativeAltitude)) : null;

  // Helper to check if a value is meaningful (not empty, null, undefined, or the string "undefined")
  const hasValue = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed !== '' && trimmed.toLowerCase() !== 'undefined' && trimmed.toLowerCase() !== 'nan';
    }
    return true;
  };

  // Build raw_data object with all fields
  const rawData: Record<string, any> = {};
  
  // Only include fields that have meaningful values
  if (id !== null && !isNaN(id)) rawData.id = id;
  if (hasValue(year) && year !== null) rawData.year = year;
  if (hasValue(month) && month !== null) rawData.month = month;
  if (hasValue(day) && day !== null) rawData.day = day;
  if (hasValue(row.time)) rawData.time = row.time.trim();
  if (hasValue(row.location)) rawData.location = row.location.trim();
  if (hasValue(row.stateOrProvince)) rawData.stateOrProvince = row.stateOrProvince.trim();
  if (hasValue(row.title)) rawData.title = row.title.trim();
  if (hasValue(row.description)) rawData.description = row.description.trim();
  if (hasValue(row.locale)) rawData.locale = row.locale.trim();
  if (hasValue(duration) && duration !== null) rawData.duration = duration;
  if (hasValue(longitude) && longitude !== null) rawData.longitude = longitude;
  if (hasValue(latitude) && latitude !== null) rawData.latitude = latitude;
  if (hasValue(elevation)) rawData.elevation = String(elevation);
  if (hasValue(relativeAltitude)) rawData.relativeAltitude = String(relativeAltitude);
  if (hasValue(row.locationFlags)) rawData.locationFlags = row.locationFlags.trim();
  if (hasValue(row.miscellaneousFlags)) rawData.miscellaneousFlags = row.miscellaneousFlags.trim();
  if (hasValue(row.typeOfUfoCraftFlags)) rawData.typeOfUfoCraftFlags = row.typeOfUfoCraftFlags.trim();
  if (hasValue(row.aliensMonstersFlags)) rawData.aliensMonstersFlags = row.aliensMonstersFlags.trim();
  if (hasValue(row.apparentUfoOccupantActivitiesFlags)) rawData.apparentUfoOccupantActivitiesFlags = row.apparentUfoOccupantActivitiesFlags.trim();
  if (hasValue(row.placesVisitedAndThingsAffectedFlags)) rawData.placesVisitedAndThingsAffectedFlags = row.placesVisitedAndThingsAffectedFlags.trim();
  if (hasValue(row.evidenceAndSpecialEffectsFlags)) rawData.evidenceAndSpecialEffectsFlags = row.evidenceAndSpecialEffectsFlags.trim();
  if (hasValue(row.miscellaneousDetailsFlags)) rawData.miscellaneousDetailsFlags = row.miscellaneousDetailsFlags.trim();
  if (hasValue(row.ref)) rawData.ref = row.ref.trim();
  if (hasValue(strangeness) && strangeness !== null) rawData.strangeness = strangeness;
  if (hasValue(credibility) && credibility !== null) rawData.credibility = credibility;
  if (hasValue(row.continent)) rawData.continent = row.continent.trim();
  if (hasValue(row.country)) rawData.country = row.country.trim();

  return {
    udb_id: id,
    raw_data: rawData,
  };
}

/**
 * Generate SQL INSERT statement for a record
 */
function generateInsertStatement(record: { udb_id: number; raw_data: Record<string, any> }): string {
  // Use dollar-quoting for JSON to avoid escaping issues
  const rawDataJson = JSON.stringify(record.raw_data);
  
  return `INSERT INTO public.udb_parsed (udb_id, raw_data)
VALUES (${record.udb_id}, $json$${rawDataJson}$json$::jsonb)
ON CONFLICT (udb_id) DO UPDATE SET raw_data = EXCLUDED.raw_data;`;
}

/**
 * Main function
 */
async function main() {
  console.log('Generating UDB seed migration from CSV...\n');
  console.log(`Input CSV: ${CSV_FILE_PATH}`);
  console.log(`Output SQL: ${OUTPUT_FILE_PATH}\n`);

  try {
    // Read CSV file
    console.log('Reading CSV file...');
    const csvContent = await readFile(CSV_FILE_PATH, 'utf-8');
    
    // Parse CSV
    console.log('Parsing CSV...');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Found ${records.length} records\n`);

    // Generate SQL file
    console.log('Generating SQL migration file...');
    
    const sqlHeader = `-- Migration: Seed UDB data from CSV export
-- This migration imports the Larry Hatch UDB dataset from data/larryhatch/export.csv
-- The data is inserted into udb_parsed table with raw_data JSONB field
-- The database trigger will automatically populate explicit columns (udb_*) from raw_data
--
-- Generated: ${new Date().toISOString()}
-- Source: data/larryhatch/export.csv
-- Records: ${records.length}

-- Disable trigger temporarily for faster inserts (we'll re-enable it)
-- Note: The trigger will still run on each INSERT, but we can optimize if needed
-- ALTER TABLE public.udb_parsed DISABLE TRIGGER sync_udb_explicit_columns_trigger;

-- Insert records in batches for better performance
BEGIN;

`;

    const sqlFooter = `
COMMIT;

-- Re-enable trigger (if we disabled it)
-- ALTER TABLE public.udb_parsed ENABLE TRIGGER sync_udb_explicit_columns_trigger;

-- Verify the import
-- SELECT COUNT(*) FROM public.udb_parsed;
-- SELECT MIN(udb_id), MAX(udb_id) FROM public.udb_parsed;
`;

    // Process records in batches to generate SQL
    const BATCH_SIZE = 100;
    const sqlStatements: string[] = [];
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchStatements: string[] = [];
      
      for (const row of batch) {
        try {
          const record = csvRowToUdbRecord(row);
          const insertSql = generateInsertStatement(record);
          batchStatements.push(insertSql);
        } catch (error) {
          console.warn(`⚠️  Error processing row ${i + batch.indexOf(row) + 1}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      sqlStatements.push(...batchStatements);
      
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= records.length) {
        console.log(`Processed ${Math.min(i + BATCH_SIZE, records.length)} / ${records.length} records...`);
      }
    }

    // Combine all SQL
    const fullSql = sqlHeader + sqlStatements.join('\n') + sqlFooter;

    // Write SQL file
    console.log('\nWriting SQL migration file...');
    await writeFile(OUTPUT_FILE_PATH, fullSql, 'utf-8');

    console.log(`\n✅ Successfully generated seed migration file!`);
    console.log(`   File: ${OUTPUT_FILE_PATH}`);
    console.log(`   Records: ${sqlStatements.length}`);
    console.log(`\nTo apply the migration, run:`);
    console.log(`   pnpm run-supabase-migrations`);
    console.log(`\nOr manually execute the SQL file in your database.`);
  } catch (error) {
    console.error('\n❌ Error generating seed migration:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Error:', JSON.stringify(error, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

