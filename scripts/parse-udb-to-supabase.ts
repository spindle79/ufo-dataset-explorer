#!/usr/bin/env tsx

/**
 * Parse UDB (Larry Hatch UFO Database) records into Supabase
 * 
 * This script:
 * 1. Queries UDB records using the uDb CLI wrapper
 * 2. Inserts records into the udb_parsed table
 * 3. Optionally creates entries in normalized_data table
 * 4. Handles batching and error recovery
 * 
 * Usage:
 *   tsx scripts/parse-udb-to-supabase.ts [options]
 *   npm run parse-udb-to-supabase [options]
 * 
 * Options:
 *   --batch-size <number>    Number of records to process per batch (default: 100)
 *   --max-records <number>   Maximum total records to process (default: all)
 *   --match <criteria>       Match criteria for filtering records (e.g., "year=1972")
 *   --skip-existing          Skip records that already exist in database
 *   --normalize              Also create entries in normalized_data table
 *   --database <type>        Database type: 'udb' or 'nuforc' (default: 'udb')
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from 'pg';
import { queryUDb } from '../app/lib/udb';
import { createAdminClient } from '../app/lib/supabase/server';
import type { UdbRecord } from '../app/lib/udb';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

// Configuration
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_RECORDS = null; // null means process all
const DEFAULT_DATABASE = 'udb';

interface Config {
  batchSize: number;
  maxRecords: number | null;
  match: string | null;
  skipExisting: boolean;
  normalize: boolean;
  database: 'udb' | 'nuforc';
}

// Parse command line arguments
function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    batchSize: DEFAULT_BATCH_SIZE,
    maxRecords: DEFAULT_MAX_RECORDS,
    match: null,
    skipExisting: false,
    normalize: false,
    database: DEFAULT_DATABASE,
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
      case '--match':
        config.match = args[++i];
        break;
      case '--skip-existing':
        config.skipExisting = true;
        break;
      case '--normalize':
        config.normalize = true;
        break;
      case '--database':
        config.database = args[++i] as 'udb' | 'nuforc';
        break;
      case '--help':
        console.log(`
Parse UDB records into Supabase

Usage:
  tsx scripts/parse-udb-to-supabase.ts [options]

Options:
  --batch-size <number>    Number of records per batch (default: ${DEFAULT_BATCH_SIZE})
  --max-records <number>    Maximum total records to process (default: all)
  --match <criteria>        Match criteria (e.g., "year=1972")
  --skip-existing           Skip records that already exist
  --normalize               Also create normalized_data entries
  --database <type>         Database type: 'udb' or 'nuforc' (default: 'udb')
  --help                    Show this help message
        `);
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Get existing UDB IDs from Supabase
 */
async function getExistingUdbIds(supabase: ReturnType<typeof createAdminClient>, limit = 10000): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('udb_parsed')
    .select('udb_id')
    .limit(limit);

  if (error) {
    console.error('Error fetching existing IDs:', error);
    return new Set();
  }

  return new Set(data?.map((row) => row.udb_id) || []);
}

/**
 * Insert UDB records using direct PostgreSQL connection (bypasses PostgREST 404 issue)
 */
async function insertUdbRecordsDirect(
  records: UdbRecord[],
  existingIds: Set<number> | null
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

    const recordsToInsert: Array<{
      udb_id: number;
      raw_data: UdbRecord;
      [key: string]: any;
    }> = [];

    for (const record of records) {
      if (existingIds && existingIds.has(record.id)) {
        continue;
      }

      // Helper function to safely convert to integer (handles NaN)
      const safeInt = (val: any, fieldName: string): number | null => {
        if (val == null) return null;
        const num = typeof val === 'number' ? val : parseInt(val, 10);
        if (isNaN(num)) {
          console.warn(`⚠️  Invalid integer value for udb_id ${record.id}, field ${fieldName}: ${JSON.stringify(val)} (converting to null)`);
          return null;
        }
        return num;
      };

      // Helper function to safely convert to float (handles NaN)
      const safeFloat = (val: any, fieldName: string): number | null => {
        if (val == null) return null;
        const num = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(num)) {
          console.warn(`⚠️  Invalid float value for udb_id ${record.id}, field ${fieldName}: ${JSON.stringify(val)} (converting to null)`);
          return null;
        }
        return num;
      };

      recordsToInsert.push({
        udb_id: record.id,
        raw_data: record,
        udb_year: safeInt(record.year, 'udb_year'),
        udb_month: safeInt(record.month, 'udb_month'),
        udb_day: safeInt(record.day, 'udb_day'),
        udb_time: record.time ?? null,
        udb_location: record.location ?? null,
        udb_state_or_province: record.stateOrProvince ?? null,
        udb_country: record.country ?? null,
        udb_title: record.title ?? null,
        udb_description: record.description ?? null,
        udb_locale: record.locale ?? null,
        udb_duration: record.duration != null ? String(record.duration) : null,
        udb_longitude: safeFloat(record.longitude, 'udb_longitude'),
        udb_latitude: safeFloat(record.latitude, 'udb_latitude'),
        udb_elevation: record.elevation != null ? String(record.elevation) : null,
        udb_relative_altitude: record.relativeAltitude != null ? String(record.relativeAltitude) : null,
        udb_location_flags: record.locationFlags ?? null,
        udb_miscellaneous_flags: record.miscellaneousFlags ?? null,
        udb_type_of_ufo_craft_flags: record.typeOfUfoCraftFlags ?? null,
        udb_aliens_monsters_flags: record.aliensMonstersFlags ?? null,
        udb_apparent_ufo_occupant_activities_flags: record.apparentUfoOccupantActivitiesFlags ?? null,
        udb_places_visited_and_things_affected_flags: record.placesVisitedAndThingsAffectedFlags ?? null,
        udb_evidence_and_special_effects_flags: record.evidenceAndSpecialEffectsFlags ?? null,
        udb_miscellaneous_details_flags: record.miscellaneousDetailsFlags ?? null,
        udb_ref: record.ref ?? null,
        udb_strangeness: safeInt(record.strangeness, 'udb_strangeness'),
        udb_credibility: safeInt(record.credibility, 'udb_credibility'),
        udb_continent: record.continent ?? null,
      });
    }

    if (recordsToInsert.length === 0) {
      return { inserted: 0, skipped: records.length };
    }

    // Use PostgreSQL INSERT ... ON CONFLICT for upsert
    // Insert records one by one to handle JSONB properly
    let inserted = 0;
    for (const record of recordsToInsert) {
      const columns = Object.keys(record);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map(col => {
        const val = record[col];
        // Handle JSONB for raw_data
        if (col === 'raw_data') {
          return JSON.stringify(val);
        }
        return val;
      });

      const setClause = columns
        .filter(col => col !== 'udb_id')
        .map(col => {
          if (col === 'raw_data') {
            return `${col} = EXCLUDED.${col}::jsonb`;
          }
          return `${col} = EXCLUDED.${col}`;
        })
        .join(', ');

      const query = `
        INSERT INTO public.udb_parsed (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (udb_id) 
        DO UPDATE SET ${setClause}
      `;

      try {
        await client.query(query, values);
        inserted++;
      } catch (error: any) {
        console.error(`\n❌ Error inserting record udb_id ${record.udb_id}:`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        
        // Try to identify which field caused the issue
        if (error.code === '22P02' && error.where) {
          // PostgreSQL invalid input syntax error
          const paramMatch = error.where.match(/\$(\d+)/);
          if (paramMatch) {
            const paramIndex = parseInt(paramMatch[1], 10) - 1; // Convert to 0-based index
            const fieldName = columns[paramIndex];
            const fieldValue = values[paramIndex];
            console.error(`   Problem field: ${fieldName}`);
            console.error(`   Problem value: ${JSON.stringify(fieldValue)} (type: ${typeof fieldValue})`);
            console.error(`   Record data:`, {
              udb_id: record.udb_id,
              [fieldName]: fieldValue,
            });
          }
        }
        
        // Log the full record for debugging
        console.error(`   Full record (first 5 fields):`, {
          udb_id: record.udb_id,
          udb_year: record.udb_year,
          udb_month: record.udb_month,
          udb_day: record.udb_day,
          udb_location: record.udb_location,
        });
        
        throw error;
      }
    }

    const result = { rowCount: inserted };
    return {
      inserted: result.rowCount || 0,
      skipped: records.length - recordsToInsert.length,
    };
  } finally {
    await client.end();
  }
}

/**
 * Insert UDB records into Supabase
 */
async function insertUdbRecords(
  supabase: ReturnType<typeof createAdminClient>,
  records: UdbRecord[],
  skipExisting: boolean,
  existingIds: Set<number> | null
): Promise<{ inserted: number; skipped: number }> {
  const recordsToInsert: Array<{
    udb_id: number;
    raw_data: UdbRecord;
    udb_year?: number | null;
    udb_month?: number | null;
    udb_day?: number | null;
    udb_time?: string | null;
    udb_location?: string | null;
    udb_state_or_province?: string | null;
    udb_country?: string | null;
    udb_title?: string | null;
    udb_description?: string | null;
    udb_latitude?: number | null;
    udb_longitude?: number | null;
    udb_credibility?: number | null;
    udb_strangeness?: number | null;
    udb_duration?: string | null;
  }> = [];

  for (const record of records) {
    // Skip if record already exists
    if (skipExisting && existingIds && existingIds.has(record.id)) {
      continue;
    }

    // Flatten the record: map all fields to explicit columns and keep raw_data
    recordsToInsert.push({
      udb_id: record.id,
      raw_data: record,
      // Map all fields to explicit columns (flattened)
      udb_year: record.year ?? null,
      udb_month: record.month ?? null,
      udb_day: record.day ?? null,
      udb_time: record.time ?? null,
      udb_location: record.location ?? null,
      udb_state_or_province: record.stateOrProvince ?? null,
      udb_country: record.country ?? null,
      udb_title: record.title ?? null,
      udb_description: record.description ?? null,
      udb_locale: record.locale ?? null,
      // Convert duration from number to string if present
      udb_duration: record.duration != null ? String(record.duration) : null,
      udb_longitude: record.longitude ?? null,
      udb_latitude: record.latitude ?? null,
      udb_elevation: record.elevation != null ? String(record.elevation) : null,
      udb_relative_altitude: record.relativeAltitude != null ? String(record.relativeAltitude) : null,
      udb_location_flags: record.locationFlags ?? null,
      udb_miscellaneous_flags: record.miscellaneousFlags ?? null,
      udb_type_of_ufo_craft_flags: record.typeOfUfoCraftFlags ?? null,
      udb_aliens_monsters_flags: record.aliensMonstersFlags ?? null,
      udb_apparent_ufo_occupant_activities_flags: record.apparentUfoOccupantActivitiesFlags ?? null,
      udb_places_visited_and_things_affected_flags: record.placesVisitedAndThingsAffectedFlags ?? null,
      udb_evidence_and_special_effects_flags: record.evidenceAndSpecialEffectsFlags ?? null,
      udb_miscellaneous_details_flags: record.miscellaneousDetailsFlags ?? null,
      udb_ref: record.ref ?? null,
      udb_strangeness: record.strangeness ?? null,
      udb_credibility: record.credibility ?? null,
      udb_continent: record.continent ?? null,
    });
  }

  if (recordsToInsert.length === 0) {
    return { inserted: 0, skipped: records.length };
  }

  // First, verify the table exists and we can query it
  console.log('Verifying table access...');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Service Role Key (first 20 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
  
  // Test direct PostgREST endpoint
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('\nTesting direct PostgREST endpoint...');
  try {
    const directTest = await fetch(`${supabaseUrl}/rest/v1/udb_parsed?select=udb_id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey!,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    console.log('Direct GET test status:', directTest.status, directTest.statusText);
    if (!directTest.ok) {
      const text = await directTest.text();
      console.error('Direct GET response:', text);
    } else {
      const data = await directTest.json();
      console.log('✅ Direct GET test passed, got', Array.isArray(data) ? data.length : 'data');
    }
  } catch (e) {
    console.error('Direct GET test error:', e);
  }
  
  const { data: tableCheck, error: tableError } = await supabase
    .from('udb_parsed')
    .select('udb_id')
    .limit(1);
  
  if (tableError) {
    console.error('❌ Cannot access udb_parsed table:');
    console.error('Error:', tableError);
    console.error('Error type:', typeof tableError);
    console.error('Error keys:', Object.keys(tableError || {}));
    if (tableError.message) console.error('Error message:', tableError.message);
    if (tableError.code) console.error('Error code:', tableError.code);
    if (tableError.details) console.error('Error details:', tableError.details);
    throw new Error(`Cannot access udb_parsed table: ${tableError.message || JSON.stringify(tableError)}`);
  }
  console.log('✅ Table access verified via Supabase client');
  
  // Test direct POST to PostgREST
  console.log('\nTesting direct POST to PostgREST...');
  try {
    const testRecord = {
      udb_id: 999999,
      raw_data: { test: true },
    };
    
    // Try with different header combinations
    console.log('Trying POST with service_role token...');
    const directPost = await fetch(`${supabaseUrl}/rest/v1/udb_parsed`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey!,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(testRecord),
    });
    
    console.log('Direct POST test status:', directPost.status, directPost.statusText);
    if (!directPost.ok) {
      const text = await directPost.text();
      console.error('Direct POST response body:', text);
      console.error('Direct POST response length:', text.length);
      console.error('Direct POST headers:', Object.fromEntries(directPost.headers.entries()));
      
      // Try to parse as JSON if possible
      try {
        const json = JSON.parse(text);
        console.error('Direct POST response JSON:', JSON.stringify(json, null, 2));
      } catch {
        console.error('Direct POST response is not JSON');
      }
      
      // Check if it's a PostgREST schema issue - try with schema prefix
      console.log('\nTrying POST with explicit schema...');
      const schemaPost = await fetch(`${supabaseUrl}/rest/v1/rpc/postgrest.write`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey!,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ table: 'udb_parsed', data: testRecord }),
      });
      console.log('Schema POST status:', schemaPost.status, schemaPost.statusText);
      
      // Check PostgREST schema endpoint
      console.log('\nChecking PostgREST schema info...');
      const schemaInfo = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': serviceKey!,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      console.log('Schema info status:', schemaInfo.status);
      if (schemaInfo.ok) {
        const info = await schemaInfo.json();
        console.log('Available endpoints:', Object.keys(info || {}));
      }
    } else {
      const data = await directPost.json();
      console.log('✅ Direct POST test passed!');
      // Clean up
      await fetch(`${supabaseUrl}/rest/v1/udb_parsed?udb_id=eq.999999`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey!,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
    }
  } catch (e) {
    console.error('Direct POST test error:', e);
  }


  // Try inserting a single record first to get better error messages
  if (recordsToInsert.length > 1) {
    console.log('Testing with a single record first...');
    const testRecord = recordsToInsert[0];
    
    // Log what we're trying to insert
    console.log('Test record structure:', {
      udb_id: testRecord.udb_id,
      has_raw_data: !!testRecord.raw_data,
      raw_data_keys: testRecord.raw_data ? Object.keys(testRecord.raw_data) : [],
      explicit_columns: Object.keys(testRecord).filter(k => k.startsWith('udb_') && k !== 'udb_id'),
    });
    
    // Try insert first to see if that works
    console.log('Trying insert (not upsert) first...');
    const insertTest = await supabase
      .from('udb_parsed')
      .insert([testRecord])
      .select();
    
    if (insertTest.error) {
      console.error('Insert test failed:');
      console.error('Status:', insertTest.status);
      console.error('StatusText:', insertTest.statusText);
      console.error('Error:', insertTest.error);
    } else {
      console.log('✅ Insert test passed! Trying upsert now...');
    }
    
    // Try upsert without select first
    console.log('Trying upsert without select...');
    const upsertNoSelect = await supabase
      .from('udb_parsed')
      .upsert([testRecord], {
        onConflict: 'udb_id',
        ignoreDuplicates: false,
      });
    
    if (upsertNoSelect.error) {
      console.error('Upsert (no select) failed:');
      console.error('Status:', upsertNoSelect.status);
      console.error('StatusText:', upsertNoSelect.statusText);
      console.error('Error:', upsertNoSelect.error);
    } else {
      console.log('✅ Upsert (no select) succeeded!');
    }
    
    // Now try with select
    const testResult = await supabase
      .from('udb_parsed')
      .upsert([testRecord], {
        onConflict: 'udb_id',
        ignoreDuplicates: false,
      })
      .select();
    
    // Log the entire result object to see its structure
    console.log('Full result object keys:', Object.keys(testResult || {}));
    console.log('Result structure:', {
      hasError: !!testResult.error,
      hasData: !!testResult.data,
      errorType: typeof testResult.error,
      errorIsObject: testResult.error && typeof testResult.error === 'object',
    });
    
    if (testResult.error) {
      console.error('Single record test failed. Error details:');
      console.error('Error object:', testResult.error);
      console.error('Error keys:', Object.keys(testResult.error || {}));
      console.error('Error toString:', String(testResult.error));
      console.error('Error valueOf:', (testResult.error as any)?.valueOf?.());
      
      // Check if error is nested (extra depth)
      const err = testResult.error as any;
      console.error('Error.error:', err?.error);
      console.error('Error.body:', err?.body);
      console.error('Error.data:', err?.data);
      
      // Try to access error properties directly
      console.error('Error message:', err?.message);
      console.error('Error details:', err?.details);
      console.error('Error hint:', err?.hint);
      console.error('Error code:', err?.code);
      console.error('Error status:', err?.status);
      console.error('Error statusText:', err?.statusText);
      
      // Check if it's a PostgREST error
      if (err?.response) {
        console.error('Error response:', err.response);
        console.error('Error response.data:', err.response?.data);
        console.error('Error response.body:', err.response?.body);
      }
      if (err?.context) {
        console.error('Error context:', err.context);
      }
      
      // Try to get the full response - check for nested error
      const fullError = JSON.stringify(testResult.error, (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      }, 2);
      console.error('Full error JSON:', fullError);
      
      // Try to stringify the entire result object
      const fullResult = JSON.stringify(testResult, (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      }, 2);
      console.error('Full result JSON:', fullResult);
      
      // If error is empty, check for nested error structure
      if (!err?.message && !err?.details && !err?.hint) {
        console.error('⚠️  Error object appears empty. Checking for nested error structure...');
        
        // Check if error.error exists (nested error)
        if (err?.error) {
          console.error('Found nested error.error:', err.error);
          const nestedErr = err.error as any;
          console.error('Nested error message:', nestedErr?.message);
          console.error('Nested error details:', nestedErr?.details);
          console.error('Nested error hint:', nestedErr?.hint);
          console.error('Nested error code:', nestedErr?.code);
          
          // Use nested error if found
          if (nestedErr?.message || nestedErr?.details || nestedErr?.hint) {
            throw new Error(`Failed to insert test record: ${nestedErr?.message || nestedErr?.details || nestedErr?.hint}`);
          }
        }
        
        // Check if error.body exists (PostgREST format)
        if (err?.body) {
          console.error('Found error.body:', err.body);
          const bodyErr = err.body as any;
          console.error('Body error message:', bodyErr?.message);
          console.error('Body error details:', bodyErr?.details);
          console.error('Body error hint:', bodyErr?.hint);
          console.error('Body error code:', bodyErr?.code);
          
          if (bodyErr?.message || bodyErr?.details || bodyErr?.hint) {
            throw new Error(`Failed to insert test record: ${bodyErr?.message || bodyErr?.details || bodyErr?.hint}`);
          }
        }
        
        console.error('This might indicate:');
        console.error('   1. A trigger or constraint violation that\'s not being reported');
        console.error('   2. A network/connection issue');
        console.error('   3. An issue with the Supabase client error handling');
        console.error('\nTrying alternative approach: inserting without explicit columns...');
        
        // Try inserting just raw_data to see if the trigger is the issue
        const minimalRecord = {
          udb_id: testRecord.udb_id,
          raw_data: testRecord.raw_data,
        };
        
        const minimalResult = await supabase
          .from('udb_parsed')
          .upsert([minimalRecord], {
            onConflict: 'udb_id',
            ignoreDuplicates: false,
          })
          .select();
        
        if (minimalResult.error) {
          console.error('Minimal insert also failed. Checking for nested error...');
          const minErr = minimalResult.error as any;
          if (minErr?.error) {
            console.error('Minimal insert nested error:', minErr.error);
          }
          if (minErr?.body) {
            console.error('Minimal insert body error:', minErr.body);
          }
          console.error('Minimal insert error:', minimalResult.error);
        } else {
          console.error('✅ Minimal insert succeeded! The issue is likely with explicit column values.');
        }
      }
      
      // Try to extract error message from various possible locations
      const errorMsg = 
        err?.error?.message || err?.error?.details || err?.error?.hint ||
        err?.body?.message || err?.body?.details || err?.body?.hint ||
        err?.message || err?.details || err?.hint || 
        String(testResult.error);
      
      throw new Error(`Failed to insert test record: ${errorMsg}`);
    }
    console.log('✅ Single record test passed, proceeding with batch...');
  }

  // Use upsert to handle duplicates gracefully
  // When batching, if any record in the batch already exists, the entire batch insert fails
  // So we use upsert from the start to handle this efficiently
  // Note: PostgREST upsert endpoint might be at /rest/v1/table?on_conflict=column
  console.log(`Attempting to upsert ${recordsToInsert.length} records...`);
  const result = await supabase
    .from('udb_parsed')
    .upsert(recordsToInsert, {
      onConflict: 'udb_id',
      ignoreDuplicates: false,
    })
    .select();

  if (result.error) {
    // Log the raw error object first
    console.error('Raw Supabase error:', result.error);
    console.error('Error type:', typeof result.error);
    console.error('Error constructor:', result.error?.constructor?.name);
    console.error('Error keys:', Object.keys(result.error || {}));
    console.error('Error toString:', String(result.error));
    
    // Try to extract error information using various methods
    const errorInfo: any = {};
    const err = result.error as any;
    
    // Direct property access
    errorInfo.message = err?.message;
    errorInfo.details = err?.details;
    errorInfo.hint = err?.hint;
    errorInfo.code = err?.code;
    errorInfo.status = err?.status;
    errorInfo.statusText = err?.statusText;
    errorInfo.response = err?.response;
    errorInfo.context = err?.context;
    
    // Check for nested error (extra depth)
    if (err?.error) {
      console.error('Found nested error.error:', err.error);
      errorInfo.nestedError = err.error;
      errorInfo.nestedMessage = err.error?.message;
      errorInfo.nestedDetails = err.error?.details;
      errorInfo.nestedHint = err.error?.hint;
      errorInfo.nestedCode = err.error?.code;
    }
    
    // Check for error.body (PostgREST format)
    if (err?.body) {
      console.error('Found error.body:', err.body);
      errorInfo.bodyError = err.body;
      errorInfo.bodyMessage = err.body?.message;
      errorInfo.bodyDetails = err.body?.details;
      errorInfo.bodyHint = err.body?.hint;
      errorInfo.bodyCode = err.body?.code;
    }
    
    // Try to stringify the entire error with custom replacer
    try {
      errorInfo.stringified = JSON.stringify(result.error, (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      }, 2);
    } catch (e) {
      errorInfo.stringifyError = String(e);
    }
    
    // Try to get all enumerable properties
    for (const key in result.error) {
      try {
        errorInfo[key] = (result.error as any)[key];
      } catch (e) {
        errorInfo[`${key}_error`] = String(e);
      }
    }
    
    // Try to get all own properties
    const ownProps = Object.getOwnPropertyNames(result.error);
    for (const prop of ownProps) {
      if (!errorInfo[prop]) {
        try {
          errorInfo[prop] = (result.error as any)[prop];
        } catch (e) {
          errorInfo[`${prop}_error`] = String(e);
        }
      }
    }
    
    console.error('Supabase error details:', errorInfo);
    console.error('Number of records being inserted:', recordsToInsert.length);
    console.error('Records being inserted (first 2):', JSON.stringify(recordsToInsert.slice(0, 2), null, 2));
    
    // Try to get a meaningful error message - check nested locations first
    const errorMsg = 
      errorInfo.nestedMessage || errorInfo.nestedDetails || errorInfo.nestedHint ||
      errorInfo.bodyMessage || errorInfo.bodyDetails || errorInfo.bodyHint ||
      errorInfo.message || 
      errorInfo.details || 
      errorInfo.hint || 
      errorInfo.code || 
      errorInfo.stringified ||
      `Unknown error: ${JSON.stringify(errorInfo)}`;
    
    throw new Error(`Failed to insert records: ${errorMsg}`);
  }

  if (!result.data) {
    throw new Error('No data returned from Supabase insert/upsert, but no error was reported');
  }

  return {
    inserted: result.data.length || 0,
    skipped: records.length - recordsToInsert.length,
  };
}

/**
 * Create normalized data entries
 */
async function createNormalizedEntries(
  supabase: ReturnType<typeof createAdminClient>,
  udbRecords: Array<{ udb_id: number; raw_data: UdbRecord }>
): Promise<{ inserted: number }> {
  const normalizedEntries = [];

  for (const udbRecord of udbRecords) {
    // Get the inserted UDB record to get its UUID
    const { data: udbData } = await supabase
      .from('udb_parsed')
      .select('id')
      .eq('udb_id', udbRecord.udb_id)
      .single();

    if (!udbData) {
      console.warn(`Could not find UDB record with id ${udbRecord.udb_id}`);
      continue;
    }

    // Extract text content (description or title)
    const textContent =
      udbRecord.raw_data.description ||
      udbRecord.raw_data.title ||
      udbRecord.raw_data.text ||
      '';

    // Build date from year, month, day
    let date: string | null = null;
    if (udbRecord.raw_data.year) {
      const year = udbRecord.raw_data.year;
      const month = udbRecord.raw_data.month || 1;
      const day = udbRecord.raw_data.day || 1;
      date = new Date(year, month - 1, day).toISOString();
    }

    // Build categories from various fields
    const categories: string[] = [];
    if (udbRecord.raw_data.location) categories.push('location');
    if (udbRecord.raw_data.country) categories.push('country');
    if (udbRecord.raw_data.credibility) categories.push('credible');
    if (udbRecord.raw_data.strangeness) categories.push('strange');

    normalizedEntries.push({
      uid: `udb:${udbRecord.udb_id}`,
      type: 'udb',
      text_content: textContent,
      categories,
      date,
      source_id: udbData.id,
      source_type: 'udb_parsed',
      metadata: {
        year: udbRecord.raw_data.year,
        month: udbRecord.raw_data.month,
        day: udbRecord.raw_data.day,
        location: udbRecord.raw_data.location,
        stateOrProvince: udbRecord.raw_data.stateOrProvince,
        country: udbRecord.raw_data.country,
        latitude: udbRecord.raw_data.latitude,
        longitude: udbRecord.raw_data.longitude,
        credibility: udbRecord.raw_data.credibility,
        strangeness: udbRecord.raw_data.strangeness,
      },
    });
  }

  if (normalizedEntries.length === 0) {
    return { inserted: 0 };
  }

  const { data, error } = await supabase
    .from('normalized_data')
    .upsert(normalizedEntries, {
      onConflict: 'uid',
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    throw new Error(`Failed to insert normalized entries: ${error.message}`);
  }

  return { inserted: data?.length || 0 };
}

/**
 * Main function
 */
async function main() {
  const config = parseArgs();

  console.log('Starting UDB to Supabase import...');
  console.log('Configuration:', {
    batchSize: config.batchSize,
    maxRecords: config.maxRecords || 'all',
    match: config.match || 'none',
    skipExisting: config.skipExisting,
    normalize: config.normalize,
    database: config.database,
  });

  // Initialize Supabase
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error('Failed to initialize Supabase:', (error as Error).message);
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  // Get existing IDs if skipping
  let existingIds: Set<number> | null = null;
  if (config.skipExisting) {
    console.log('Fetching existing UDB IDs...');
    existingIds = await getExistingUdbIds(supabase);
    console.log(`Found ${existingIds.size} existing records`);
  }

  // Get existing UDB IDs to avoid duplicates
  const { data: existingUdbData } = await supabase
    .from('udb_parsed')
    .select('udb_id');
  
  const existingUdbIds = new Set(existingUdbData?.map((r) => r.udb_id) || []);
  console.log(`Found ${existingUdbIds.size} existing UDB records in database`);

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalNormalized = 0;

  try {
    // For UDB database, fetch all records at once (no batching needed)
    // For NUFORC, batching would be handled differently if needed
    if (config.database === 'udb') {
      console.log('\nFetching all UDB records...');

      // Query all UDB records (or up to maxRecords limit)
      const maxCount = config.maxRecords || 1000000; // Large number to get all records
      const result = await queryUDb({
        database: config.database,
        match: config.match || undefined,
        maxCount,
        firstIndex: 1,
        format: 'json',
        allowEmpty: true,
      });

      if (!result.records || result.records.length === 0) {
        console.log('No records found in UDB database');
      } else {
        console.log(`Fetched ${result.records.length} records from UDB`);
        
        // Filter out records that have already been imported (by ID)
        const recordsToProcess = result.records.filter((r) => {
          if (existingUdbIds.has(r.id)) {
            return false; // Already exists
          }
          if (config.skipExisting && existingIds && existingIds.has(r.id)) {
            return false; // Already exists (from skipExisting check)
          }
          return true;
        });

        if (recordsToProcess.length === 0) {
          console.log('All records already imported');
        } else {
          console.log(`Processing ${recordsToProcess.length} new records (${result.records.length - recordsToProcess.length} already imported)`);

          // Process in chunks to avoid overwhelming Supabase
          const chunkSize = config.batchSize;
          for (let i = 0; i < recordsToProcess.length; i += chunkSize) {
            const chunk = recordsToProcess.slice(i, i + chunkSize);
            console.log(`\nProcessing chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} records)...`);

            // Insert into Supabase using direct PostgreSQL connection
            // (PostgREST is returning 404 for POST requests, so we bypass it)
            console.log('Using direct PostgreSQL connection (bypassing PostgREST)...');
            const insertResult = await insertUdbRecordsDirect(
              chunk,
              existingUdbIds
            );

            totalInserted += insertResult.inserted;
            totalSkipped += insertResult.skipped;
            totalProcessed += chunk.length;

            console.log(`Inserted: ${insertResult.inserted}, Skipped: ${insertResult.skipped}`);

            // Create normalized entries if requested
            if (config.normalize && insertResult.inserted > 0) {
              const udbRecords = chunk.map((r) => ({
                udb_id: r.id,
                raw_data: r,
              }));

              const normalizedResult = await createNormalizedEntries(supabase, udbRecords);
              totalNormalized += normalizedResult.inserted;
              console.log(`Created ${normalizedResult.inserted} normalized entries`);
            }

            // Update existing IDs set
            chunk.forEach((r) => {
              existingUdbIds.add(r.id);
              if (config.skipExisting && existingIds) {
                existingIds.add(r.id);
              }
            });

            // Small delay to avoid overwhelming the database
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
    } else {
      // For NUFORC or other databases, use batching (if needed in the future)
      console.log('\nBatching not yet implemented for non-UDB databases');
      throw new Error('Batching for non-UDB databases not implemented');
    }

    console.log('\n=== Import Complete ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped: ${totalSkipped}`);
    if (config.normalize) {
      console.log(`Total normalized: ${totalNormalized}`);
    }
  } catch (error) {
    console.error('\nError during import:', error);
    console.error('Stack:', (error as Error).stack);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

