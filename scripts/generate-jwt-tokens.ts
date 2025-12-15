#!/usr/bin/env tsx

/**
 * Generate JWT tokens for Supabase anon and service_role keys
 * 
 * For local Supabase, the anon and service_role keys need to be JWT tokens
 * signed with the JWT_SECRET, not random strings.
 * 
 * Usage:
 *   tsx scripts/generate-jwt-tokens.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as crypto from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

/**
 * Generate a JWT token
 */
function generateJWT(payload: Record<string, any>, secret: string): string {
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
 * Main function
 */
function main() {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiry = parseInt(process.env.JWT_EXPIRY || '3600', 10);

  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is not set in .env.local');
    console.error('Please run: npm run setup-supabase');
    process.exit(1);
  }

  console.log('Generating JWT tokens for Supabase...\n');

  // For local development, use a very long expiry (10 years) or no expiry
  // This avoids having to regenerate tokens constantly
  const localDevExpiry = 10 * 365 * 24 * 60 * 60; // 10 years in seconds
  const useLongExpiry = process.env.NODE_ENV !== 'production';

  // Generate anon key (anonymous role)
  const anonPayload: Record<string, any> = {
    role: 'anon',
  };
  if (useLongExpiry) {
    anonPayload.exp = Math.floor(Date.now() / 1000) + localDevExpiry;
  } else {
    anonPayload.exp = Math.floor(Date.now() / 1000) + jwtExpiry;
  }
  const anonKey = generateJWT(anonPayload, jwtSecret);

  // Generate service_role key (service role with full access)
  const serviceRolePayload: Record<string, any> = {
    role: 'service_role',
  };
  if (useLongExpiry) {
    serviceRolePayload.exp = Math.floor(Date.now() / 1000) + localDevExpiry;
  } else {
    serviceRolePayload.exp = Math.floor(Date.now() / 1000) + jwtExpiry;
  }
  const serviceRoleKey = generateJWT(serviceRolePayload, jwtSecret);

  console.log('✅ Generated JWT tokens:\n');
  console.log('SUPABASE_ANON_KEY=' + anonKey);
  console.log('SUPABASE_SERVICE_ROLE_KEY=' + serviceRoleKey);
  console.log('\n📝 Copy these to your .env.local file:');
  console.log('\nSUPABASE_ANON_KEY=' + anonKey);
  console.log('SUPABASE_SERVICE_ROLE_KEY=' + serviceRoleKey);
  
  if (useLongExpiry) {
    console.log('\n✅ Tokens set to expire in 10 years (suitable for local development)');
  } else {
    console.log('\n⚠️  Tokens will expire in', jwtExpiry, 'seconds.');
  }
  
  console.log('\n💡 Tip: You can update .env.local manually or use a script to do it automatically.');
}

main();

