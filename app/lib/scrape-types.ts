/**
 * Type definitions for scraped web page content
 * 
 * Note: Database types are defined in supabase-types.ts
 * These types are kept for backward compatibility and internal use
 */

// Re-export database types for convenience
export type { ScrapedPage, ScrapedPageCreate, ScrapedPageUpdate } from './supabase-types';

export interface PageContent {
  markdown: string;
  text: string;
  rawHtml: string; // Cleaned HTML before markdown conversion
  url: string;
  title?: string;
}

