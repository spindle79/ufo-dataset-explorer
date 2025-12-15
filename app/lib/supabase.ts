/**
 * Supabase Client Configuration
 * 
 * Re-exports Supabase SSR clients for convenient importing.
 * 
 * Usage:
 * - Browser: import { createBrowserClient } from '@/lib/supabase'
 * - Server: import { createServerClient, createAdminClient } from '@/lib/supabase'
 * - Middleware: import { createMiddlewareClient } from '@/lib/supabase'
 */

export { createClient as createBrowserClient } from './supabase/client';
export { createClient as createServerClient, createAdminClient } from './supabase/server';
export { createClient as createMiddlewareClient } from './supabase/middleware';

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (process.env.SUPABASE_ANON_KEY || 
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
     process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

