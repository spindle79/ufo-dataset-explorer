/**
 * Setup Supabase Storage Buckets
 * 
 * Creates the necessary storage buckets for the UFO Dataset Explorer.
 * This script should be run after Supabase is initialized.
 * 
 * Usage: node scripts/setup-storage-buckets.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration.');
  console.error('Please run: npm run setup-supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Storage bucket configuration
 */
const BUCKETS = [
  {
    name: 'original-uploads',
    description: 'General uploads bucket for all file types',
    public: false, // Private by default, use signed URLs for access
  },
  {
    name: 'nuforc-files',
    description: 'NUFORC dataset files',
    public: false,
  },
  {
    name: 'udb-files',
    description: 'UDB (Larry Hatch) dataset files',
    public: false,
  },
  {
    name: 'audio-files',
    description: 'Audio files and recordings',
    public: false,
  },
  {
    name: 'pdf-files',
    description: 'PDF documents and files',
    public: false,
  },
  {
    name: 'scraped-pages',
    description: 'Scraped web pages (markdown and HTML content)',
    public: false,
  },
];

/**
 * Create a storage bucket
 */
async function createBucket(bucketConfig) {
  const { name, description, public: isPublic } = bucketConfig;

  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    const bucketExists = existingBuckets?.some((b) => b.name === name);

    if (bucketExists) {
      console.log(`✓ Bucket "${name}" already exists`);
      return;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: null, // No limit
      allowedMimeTypes: null, // Allow all types
    });

    if (error) {
      // If bucket already exists (race condition), that's okay
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`✓ Bucket "${name}" already exists`);
        return;
      }
      throw error;
    }

    console.log(`✓ Created bucket "${name}"`);
    if (description) {
      console.log(`  ${description}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create bucket "${name}":`, error.message);
    throw error;
  }
}

/**
 * Wait for storage service to be ready
 */
async function waitForStorage(maxAttempts = 30, delayMs = 2000) {
  console.log('Waiting for Supabase Storage to be ready...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (!error) {
        console.log('✅ Storage service is ready!\n');
        return true;
      }
      
      // If it's a "buckets table doesn't exist" error, storage might still be initializing
      if (error.message.includes('buckets') && error.message.includes('does not exist')) {
        if (attempt < maxAttempts) {
          process.stdout.write(`  Attempt ${attempt}/${maxAttempts} (storage initializing)...\r`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }
      
      // For other errors, throw immediately
      throw error;
    } catch (error) {
      if (attempt < maxAttempts) {
        process.stdout.write(`  Attempt ${attempt}/${maxAttempts}...\r`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`Storage service not ready after ${maxAttempts} attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error(`Storage service not ready after ${maxAttempts} attempts`);
}

/**
 * Main setup function
 */
async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n');

  try {
    // Wait for storage service to be ready
    await waitForStorage();

    // Create all buckets
    for (const bucket of BUCKETS) {
      await createBucket(bucket);
    }

    console.log('\n✅ Storage buckets setup complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Review bucket permissions in Supabase Studio');
    console.log('  2. Set up Row Level Security (RLS) policies if needed');
    console.log('  3. Configure public access if required for specific buckets');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Supabase is running: npm run supabase:start');
    console.error('  2. Wait 30-60 seconds for storage service to initialize');
    console.error('  3. Check storage logs: docker-compose logs storage');
    console.error('  4. Ensure database migrations have run: npm run run-supabase-migrations');
    process.exit(1);
  }
}

// Run setup
setupStorageBuckets();

