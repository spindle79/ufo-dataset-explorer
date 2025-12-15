/**
 * Scrape Media Relationships
 *
 * Manages the relationship between scraped pages and media files (audio, PDF, video).
 * When links are discovered during scraping, this creates records in original_uploads
 * (if they don't exist) and establishes the relationship.
 */

import { createAdminClient } from "./supabase/server";
import { getCanonicalUrl } from "./url-utils";
import type { OriginalUploadCreate } from "./supabase-types";

export interface DiscoveredLink {
  url: string;
  type: "audio" | "pdf" | "video";
  text?: string;
  alt?: string;
}

/**
 * Create or get an original_uploads record for a discovered media URL
 * If the record doesn't exist, creates it with status='discovered'
 * Returns the ID of the record
 */
export async function getOrCreateMediaRecord(
  url: string,
  type: "audio" | "pdf" | "video"
): Promise<string> {
  const supabase = createAdminClient();
  const canonical = getCanonicalUrl(url);

  // Check if record already exists by canonical_url
  const { data: existing } = await supabase
    .from("original_uploads")
    .select("id")
    .eq("dataset_type", type)
    .eq("canonical_url", canonical)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Extract filename from URL
  const urlPath = new URL(url).pathname;
  const fileName = urlPath.split("/").pop() || `discovered-${type}-file`;

  // Create new record with status='discovered'
  // Note: file_path and file_name are required, so we use placeholders
  // These will be updated when the file is actually fetched
  const newRecord: OriginalUploadCreate = {
    file_name: fileName,
    file_path: `discovered/${type}/${canonical}`, // Placeholder path
    dataset_type: type,
    upload_method: "url_discovered", // New method type for discovered files
    original_url: url,
    canonical_url: canonical,
    status: "discovered", // New status for discovered but not yet fetched files
    metadata: {
      discovered: true,
      discovered_at: new Date().toISOString(),
    },
  };

  const { data: inserted, error } = await supabase
    .from("original_uploads")
    .insert(newRecord)
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(
      `Failed to create media record: ${error?.message || "Unknown error"}`
    );
  }

  return inserted.id;
}

/**
 * Create relationships between a scraped page and discovered media files
 */
export async function createScrapeMediaRelationships(
  scrapedPageId: string,
  links: DiscoveredLink[]
): Promise<{ created: number; skipped: number }> {
  const supabase = createAdminClient();
  let created = 0;
  let skipped = 0;

  // Process links in parallel
  const relationshipPromises = links.map(async (link) => {
    try {
      // Get or create the media record
      const mediaId = await getOrCreateMediaRecord(link.url, link.type);

      // Create the relationship (ignore if it already exists due to UNIQUE constraint)
      const { error } = await supabase
        .from("scraped_page_media")
        .insert({
          scraped_page_id: scrapedPageId,
          original_upload_id: mediaId,
          link_text: link.text || null,
          link_alt: link.alt || null,
        })
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, that's fine - relationship already exists
        if (error.code === "23505") {
          skipped++;
          return;
        }
        throw error;
      }

      created++;
    } catch (error) {
      console.error(`Failed to create relationship for ${link.url}:`, error);
      skipped++;
    }
  });

  await Promise.all(relationshipPromises);

  return { created, skipped };
}

/**
 * Get all media files discovered from a scraped page
 */
export async function getMediaForScrapedPage(scrapedPageId: string): Promise<
  Array<{
    id: string;
    type: "audio" | "pdf" | "video";
    url: string;
    status: string;
    link_text?: string;
    link_alt?: string;
    discovered_at: string;
  }>
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scraped_page_media")
    .select(
      `
      original_upload_id,
      link_text,
      link_alt,
      discovered_at,
      original_uploads:original_upload_id (
        id,
        dataset_type,
        original_url,
        canonical_url,
        status
      )
    `
    )
    .eq("scraped_page_id", scrapedPageId);

  if (error) {
    throw new Error(`Failed to get media: ${error.message}`);
  }

  return (
    data?.map((rel) => ({
      id: (rel.original_uploads as any).id,
      type: (rel.original_uploads as any).dataset_type as
        | "audio"
        | "pdf"
        | "video",
      url: (rel.original_uploads as any).original_url,
      status: (rel.original_uploads as any).status,
      link_text: rel.link_text || undefined,
      link_alt: rel.link_alt || undefined,
      discovered_at: rel.discovered_at,
    })) || []
  );
}

/**
 * Get all scraped pages that discovered a media file
 */
export async function getScrapedPagesForMedia(mediaId: string): Promise<
  Array<{
    id: string;
    url: string;
    title: string;
    discovered_at: string;
  }>
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scraped_page_media")
    .select(
      `
      scraped_page_id,
      discovered_at,
      scraped_pages:scraped_page_id (
        id,
        url,
        title
      )
    `
    )
    .eq("original_upload_id", mediaId);

  if (error) {
    throw new Error(`Failed to get scraped pages: ${error.message}`);
  }

  return (
    data?.map((rel) => ({
      id: (rel.scraped_pages as any).id,
      url: (rel.scraped_pages as any).url,
      title: (rel.scraped_pages as any).title,
      discovered_at: rel.discovered_at,
    })) || []
  );
}
