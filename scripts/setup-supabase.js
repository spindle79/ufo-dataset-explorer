#!/usr/bin/env node

/**
 * Supabase Local Setup Script
 * 
 * This script initializes a local Supabase instance using Docker.
 * It generates the necessary environment variables and creates the required directories.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Generate a random secret key
 */
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate JWT secret
 */
function generateJWTSecret() {
  return generateSecret(64);
}

/**
 * Generate a JWT token
 * @param {Record<string, any>} payload - JWT payload
 * @param {string} secret - JWT secret for signing
 * @returns {string} JWT token
 */
function generateJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = Buffer.from(JSON.stringify(header))
    .toString('base64url');
  
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read existing .env.local or create new one
 */
async function getEnvFile() {
  const envPath = path.join(projectRoot, '.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

/**
 * Update or add environment variable in .env.local
 */
async function setEnvVar(key, value, comment = '') {
  const envPath = path.join(projectRoot, '.env.local');
  let content = await getEnvFile();
  
  // Remove existing variable if present
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith(`${key}=`) && trimmed !== '';
  });
  
  // Add new variable with comment if provided
  if (comment) {
    filteredLines.push(`# ${comment}`);
  }
  filteredLines.push(`${key}=${value}`);
  
  await fs.writeFile(envPath, filteredLines.join('\n') + '\n', 'utf-8');
}

/**
 * Check if Docker is running
 */
async function checkDocker() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync('docker --version');
    // Check if Docker daemon is running
    await execAsync('docker ps', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clean up existing Supabase containers and volumes
 */
async function cleanupExisting() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  console.log('Cleaning up existing Supabase containers and volumes...');
  
  try {
    // Stop and remove containers
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    await execAsync(`docker-compose -f ${dockerComposePath} down -v`, {
      cwd: projectRoot,
      timeout: 30000,
    });
    console.log('  ✓ Stopped and removed containers');
  } catch (error) {
    // Ignore errors if containers don't exist
    if (!error.message.includes('No such service')) {
      console.log('  ℹ No existing containers to clean up');
    }
  }
  
  try {
    // Remove the postgres-data volume if it exists
    await execAsync('docker volume rm uap_postgres-data 2>/dev/null || true', {
      timeout: 10000,
    });
    console.log('  ✓ Cleaned up volumes');
  } catch (error) {
    // Ignore errors if volume doesn't exist
    console.log('  ℹ No existing volumes to clean up');
  }
  
  console.log('');
}

/**
 * Verify kong.yml has placeholders (not hardcoded values)
 */
async function verifyKongConfig() {
  const kongConfigPath = path.join(projectRoot, 'supabase', 'kong', 'kong.yml');
  const kongConfig = await fs.readFile(kongConfigPath, 'utf-8');
  
  // Check if placeholders exist
  if (!kongConfig.includes('${ANON_KEY}') || !kongConfig.includes('${SERVICE_ROLE_KEY}')) {
    console.warn('⚠️  Warning: kong.yml may have hardcoded keys instead of placeholders.');
    console.warn('   The setup script will replace placeholders, but please ensure kong.yml uses ${ANON_KEY} and ${SERVICE_ROLE_KEY}');
  }
}

/**
 * Main setup function
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup') || args.includes('-c');
  
  console.log('🚀 Setting up local Supabase instance...\n');

  // Check Docker
  console.log('Checking Docker...');
  const dockerAvailable = await checkDocker();
  if (!dockerAvailable) {
    console.error('❌ Docker is not running or not available.');
    console.error('Please start Docker Desktop and try again.');
    process.exit(1);
  }
  console.log('✅ Docker is available\n');

  // Cleanup if requested
  if (shouldCleanup) {
    await cleanupExisting();
  }
  
  // Verify kong.yml configuration
  await verifyKongConfig();

  // Create necessary directories
  console.log('Creating directories...');
  const dirs = [
    path.join(projectRoot, 'supabase', 'db', 'volumes', 'data'),
    path.join(projectRoot, 'supabase', 'db', 'init'),
    path.join(projectRoot, 'supabase', 'storage'),
    path.join(projectRoot, 'supabase', 'kong'),
  ];

  for (const dir of dirs) {
    await ensureDir(dir);
    console.log(`  ✓ ${path.relative(projectRoot, dir)}`);
  }
  console.log('');

  // Generate or reuse secrets
  console.log('Generating secrets...');
  let postgresPassword, jwtSecret, anonKey, serviceRoleKey;
  
  // Check if secrets already exist in .env.local
  const existingEnv = await getEnvFile();
  const hasExistingSecrets = 
    existingEnv.includes('POSTGRES_PASSWORD=') &&
    existingEnv.includes('JWT_SECRET=') &&
    existingEnv.includes('ANON_KEY=') &&
    existingEnv.includes('SERVICE_ROLE_KEY=');
  
  if (hasExistingSecrets && !shouldCleanup) {
    console.log('  ℹ Existing secrets found in .env.local');
    console.log('  ℹ Reusing existing secrets (use --cleanup to regenerate)\n');
    
    // Extract existing values
    const envLines = existingEnv.split('\n');
    const getEnvValue = (key) => {
      const line = envLines.find(l => l.trim().startsWith(`${key}=`));
      return line ? line.split('=')[1]?.trim() : null;
    };
    
    postgresPassword = getEnvValue('POSTGRES_PASSWORD') || generateSecret(32);
    jwtSecret = getEnvValue('JWT_SECRET') || generateJWTSecret();
    
    // Check if existing keys are JWT tokens (have 3 parts separated by dots)
    const existingAnonKey = getEnvValue('ANON_KEY');
    const existingServiceRoleKey = getEnvValue('SERVICE_ROLE_KEY');
    
    if (existingAnonKey && existingAnonKey.split('.').length === 3) {
      // Existing key is a JWT, reuse it
      anonKey = existingAnonKey;
    } else {
      // Generate new JWT token for anon
      const anonPayload = {
        role: 'anon',
        exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
      };
      anonKey = generateJWT(anonPayload, jwtSecret);
    }
    
    if (existingServiceRoleKey && existingServiceRoleKey.split('.').length === 3) {
      // Existing key is a JWT, reuse it
      serviceRoleKey = existingServiceRoleKey;
    } else {
      // Generate new JWT token for service_role
      const serviceRolePayload = {
        role: 'service_role',
        exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
      };
      serviceRoleKey = generateJWT(serviceRolePayload, jwtSecret);
    }
  } else {
    postgresPassword = generateSecret(32);
    jwtSecret = generateJWTSecret();
    
    // Generate JWT tokens for anon and service_role
    const localDevExpiry = 10 * 365 * 24 * 60 * 60; // 10 years in seconds
    
    const anonPayload = {
      role: 'anon',
      exp: Math.floor(Date.now() / 1000) + localDevExpiry,
    };
    anonKey = generateJWT(anonPayload, jwtSecret);
    
    const serviceRolePayload = {
      role: 'service_role',
      exp: Math.floor(Date.now() / 1000) + localDevExpiry,
    };
    serviceRoleKey = generateJWT(serviceRolePayload, jwtSecret);
    
    console.log('  ✓ Generated new secrets and JWT tokens\n');
  }

  // Set environment variables
  console.log('Updating .env.local...');
  
  await setEnvVar(
    'POSTGRES_PASSWORD',
    postgresPassword,
    'Supabase Postgres password'
  );
  await setEnvVar(
    'JWT_SECRET',
    jwtSecret,
    'Supabase JWT secret'
  );
  await setEnvVar(
    'JWT_EXPIRY',
    '3600',
    'Supabase JWT expiry time in seconds'
  );
  await setEnvVar(
    'ANON_KEY',
    anonKey,
    'Supabase anonymous key (public)'
  );
  await setEnvVar(
    'SERVICE_ROLE_KEY',
    serviceRoleKey,
    'Supabase service role key (private, keep secret)'
  );
  await setEnvVar(
    'SITE_URL',
    'http://localhost:3000',
    'Supabase site URL'
  );
  await setEnvVar(
    'URI_ALLOW_LIST',
    'http://localhost:3000,http://localhost:3001',
    'Supabase allowed URIs'
  );
  await setEnvVar(
    'DISABLE_SIGNUP',
    'false',
    'Supabase signup enabled (set to true to disable)'
  );
  await setEnvVar(
    'ENABLE_EMAIL_SIGNUP',
    'true',
    'Supabase email signup enabled'
  );
  await setEnvVar(
    'ENABLE_EMAIL_AUTOCONFIRM',
    'true',
    'Supabase email auto-confirm (for local dev)'
  );
  await setEnvVar(
    'IMGPROXY_ENABLE_WEBP_DETECTION',
    'true',
    'Supabase image proxy WebP detection'
  );
  await setEnvVar(
    'SUPABASE_URL',
    'http://localhost:8000',
    'Supabase API URL'
  );
  await setEnvVar(
    'SUPABASE_ANON_KEY',
    anonKey,
    'Supabase anonymous key for client'
  );
  await setEnvVar(
    'SUPABASE_SERVICE_ROLE_KEY',
    serviceRoleKey,
    'Supabase service role key for server-side operations'
  );

  console.log('  ✓ Updated .env.local\n');

  // Replace placeholders in kong.yml
  console.log('Configuring Kong API Gateway...');
  const kongConfigPath = path.join(projectRoot, 'supabase', 'kong', 'kong.yml');
  let kongConfig = await fs.readFile(kongConfigPath, 'utf-8');
  
  // Replace placeholders with actual keys
  // This works whether placeholders exist or keys are already set
  kongConfig = kongConfig.replace(/\${ANON_KEY}/g, anonKey);
  kongConfig = kongConfig.replace(/\${SERVICE_ROLE_KEY}/g, serviceRoleKey);
  
  // If placeholders don't exist (already replaced), update the key values directly
  // Find the anon consumer section and update its key
  kongConfig = kongConfig.replace(
    /(username: anon[\s\S]*?keyauth_credentials:\s*-\s*key:\s*)([^\s\n]+)/,
    `$1${anonKey}`
  );
  
  // Find the service_role consumer section and update its key
  kongConfig = kongConfig.replace(
    /(username: service_role[\s\S]*?keyauth_credentials:\s*-\s*key:\s*)([^\s\n]+)/,
    `$1${serviceRoleKey}`
  );
  
  await fs.writeFile(kongConfigPath, kongConfig, 'utf-8');
  console.log('  ✓ Kong configuration updated\n');

  // Create .env file for docker-compose (docker-compose reads .env automatically)
  console.log('Creating .env for docker-compose...');
  const envPath = path.join(projectRoot, '.env');
  const dockerComposeEnv = [
    `# Docker Compose environment variables (auto-generated by setup-supabase)`,
    `# This file is gitignored and should not be committed`,
    `POSTGRES_PASSWORD=${postgresPassword}`,
    `JWT_SECRET=${jwtSecret}`,
    `JWT_EXPIRY=3600`,
    `ANON_KEY=${anonKey}`,
    `SERVICE_ROLE_KEY=${serviceRoleKey}`,
    `SITE_URL=http://localhost:3000`,
    `URI_ALLOW_LIST=http://localhost:3000,http://localhost:3001`,
    `DISABLE_SIGNUP=false`,
    `ENABLE_EMAIL_SIGNUP=true`,
    `ENABLE_EMAIL_AUTOCONFIRM=true`,
    `IMGPROXY_ENABLE_WEBP_DETECTION=true`,
    '',
  ].join('\n');
  await fs.writeFile(envPath, dockerComposeEnv, 'utf-8');
  console.log('  ✓ .env file created\n');

  console.log('✅ Supabase setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Start Supabase: npm run supabase:start');
  console.log('  2. Wait for database to be healthy (may take 30-60 seconds)');
  console.log('  3. Run database migrations: npm run run-supabase-migrations');
  console.log('     (This creates roles, tables, and extensions)');
  console.log('  4. Verify setup: npm run verify-database');
  console.log('  5. Access Supabase Studio: http://localhost:3001');
  console.log('  6. API URL: http://localhost:8000');
  console.log('  7. Database connection:');
  console.log('     Host: localhost');
  console.log('     Port: 54325');
  console.log('     Database: postgres');
  console.log('     User: postgres');
  console.log('     Password: (check .env.local)');
  console.log('');
  console.log('💡 Tip: Use --cleanup flag to clean up existing containers before setup');
  console.log('   Example: npm run setup-supabase -- --cleanup');
  console.log('');
  console.log('⚠️  Note: The Supabase Postgres image may not automatically run init scripts.');
  console.log('   You must run migrations manually after starting: npm run run-supabase-migrations');
  console.log('');
}

main().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

