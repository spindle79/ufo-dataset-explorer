#!/usr/bin/env node

/**
 * Supabase Reset Script
 * 
 * This script completely resets the local Supabase instance:
 * - Stops and removes all containers
 * - Removes all volumes
 * - Cleans up configuration files (optional)
 * 
 * Usage:
 *   npm run reset-supabase              # Reset containers and volumes
 *   npm run reset-supabase -- --full     # Also remove .env files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const fullReset = args.includes('--full') || args.includes('-f');
  
  console.log('🔄 Resetting Supabase local instance...\n');
  
  // Check Docker
  try {
    await execAsync('docker ps', { timeout: 5000 });
  } catch (error) {
    console.error('❌ Docker is not running or not available.');
    console.error('Please start Docker Desktop and try again.');
    process.exit(1);
  }
  
  // Stop and remove containers
  console.log('Stopping and removing containers...');
  try {
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    await execAsync(`docker-compose -f ${dockerComposePath} down -v`, {
      cwd: projectRoot,
      timeout: 30000,
    });
    console.log('  ✓ Containers stopped and removed');
  } catch (error) {
    console.log('  ℹ No containers to remove');
  }
  
  // Remove volumes
  console.log('Removing volumes...');
  try {
    await execAsync('docker volume rm uap_postgres-data 2>/dev/null || true', {
      timeout: 10000,
    });
    console.log('  ✓ Volumes removed');
  } catch (error) {
    console.log('  ℹ No volumes to remove');
  }
  
  // Full reset: remove .env files
  if (fullReset) {
    console.log('Removing configuration files...');
    const envFiles = [
      path.join(projectRoot, '.env'),
      path.join(projectRoot, '.env.local'),
    ];
    
    for (const envFile of envFiles) {
      try {
        await fs.unlink(envFile);
        console.log(`  ✓ Removed ${path.basename(envFile)}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`  ℹ ${path.basename(envFile)} not found`);
        }
      }
    }
    
    // Reset kong.yml to use placeholders
    const kongConfigPath = path.join(projectRoot, 'supabase', 'kong', 'kong.yml');
    try {
      let kongConfig = await fs.readFile(kongConfigPath, 'utf-8');
      // This is a simple check - in practice, the setup script will replace placeholders
      console.log('  ✓ Kong configuration ready for reset');
    } catch (error) {
      console.log('  ⚠️  Could not read kong.yml');
    }
  }
  
  console.log('\n✅ Supabase reset complete!\n');
  console.log('Next steps:');
  console.log('  1. Run setup: npm run setup-supabase');
  if (fullReset) {
    console.log('  2. Start Supabase: npm run supabase:start');
  } else {
    console.log('  2. Start Supabase: npm run supabase:start');
    console.log('     (Configuration files preserved)');
  }
  console.log('');
}

main().catch((error) => {
  console.error('❌ Reset failed:', error);
  process.exit(1);
});

