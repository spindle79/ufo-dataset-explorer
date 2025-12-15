import { NextRequest, NextResponse } from "next/server";
import { getScrapedPageHtml, getScrapedPageById } from "@/lib/scrape-access";
import {
  extractLinksFromHtml,
  type ExtractedLink,
} from "@/lib/scrape-link-extractor";
import { createAdminClient } from "@/lib/supabase/server";
import { getCanonicalUrl } from "@/lib/url-utils";
import {
  createScrapeMediaRelationships,
  type DiscoveredLink,
} from "@/lib/scrape-media-relationships";

interface LinkWithStatus extends ExtractedLink {
  existingRecord?: {
    type: "scrape" | "audio" | "pdf" | "video";
    id: string;
    href: string;
  };
}

/**
 * Check if a URL is already processed in any miniapp
 * Uses database indexes for O(log n) lookups instead of O(n) scans
 */
async function checkUrlExists(
  url: string
): Promise<LinkWithStatus["existingRecord"] | null> {
  const supabase = createAdminClient();
  const canonical = getCanonicalUrl(url);

  // Check scraped_pages using indexed canonical_url column
  // This uses the database index for O(log n) lookup
  const { data: scrapedPage } = await supabase
    .from("scraped_pages")
    .select("id")
    .eq("canonical_url", canonical)
    .maybeSingle();

  if (scrapedPage) {
    return {
      type: "scrape",
      id: scrapedPage.id,
      href: `/scrape/${scrapedPage.id}`,
    };
  }

  // Check original_uploads for audio files using indexed canonical_url column
  // Uses composite index (dataset_type, canonical_url) for efficient lookup
  const { data: audioFile } = await supabase
    .from("original_uploads")
    .select("id")
    .eq("dataset_type", "audio")
    .eq("canonical_url", canonical)
    .maybeSingle();

  if (audioFile) {
    return {
      type: "audio",
      id: audioFile.id,
      href: `/audio/${audioFile.id}`,
    };
  }

  // Check original_uploads for PDF files using indexed canonical_url column
  const { data: pdfFile } = await supabase
    .from("original_uploads")
    .select("id")
    .eq("dataset_type", "pdf")
    .eq("canonical_url", canonical)
    .maybeSingle();

  if (pdfFile) {
    return {
      type: "pdf",
      id: pdfFile.id,
      href: `/pdf/${pdfFile.id}`,
    };
  }

  // Check original_uploads for video files using indexed canonical_url column
  const { data: videoFile } = await supabase
    .from("original_uploads")
    .select("id")
    .eq("dataset_type", "video")
    .eq("canonical_url", canonical)
    .maybeSingle();

  if (videoFile) {
    return {
      type: "video",
      id: videoFile.id,
      href: `/video/${videoFile.id}`,
    };
  }

  return null;
}

/**
 * GET /api/scrape/[id]/links
 * Extract links from the scraped page HTML and check if they're already processed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the scraped page to get the URL
    const page = await getScrapedPageById(id);
    if (!page) {
      return NextResponse.json(
        { error: "Scraped page not found" },
        { status: 404 }
      );
    }

    // Get the HTML
    const html = await getScrapedPageHtml(id);
    if (!html) {
      return NextResponse.json(
        { error: "HTML content not found" },
        { status: 404 }
      );
    }

    // Extract links
    const extractedLinks = extractLinksFromHtml(html, page.url);

    // Check which URLs are already processed using database indexes
    // Each lookup uses O(log n) index queries instead of O(n) scans
    // We can run these in parallel for better performance
    const linksWithStatus: LinkWithStatus[] = await Promise.all(
      extractedLinks.map(async (link: ExtractedLink) => {
        const existingRecord = await checkUrlExists(link.url);
        return {
          ...link,
          existingRecord: existingRecord || undefined,
        };
      })
    );

    // Optionally create relationships for discovered media files
    // Check if ?create_relationships=true query parameter is present
    const { searchParams } = new URL(request.url);
    const createRelationships =
      searchParams.get("create_relationships") === "true";

    if (createRelationships) {
      // Filter to only audio, PDF, and video links that don't already have records
      const discoveredLinks: DiscoveredLink[] = extractedLinks
        .filter(
          (link) =>
            (link.type === "audio" ||
              link.type === "pdf" ||
              link.type === "video") &&
            !linksWithStatus.find((l) => l.url === link.url)?.existingRecord
        )
        .map((link) => ({
          url: link.url,
          type: link.type as "audio" | "pdf" | "video",
          text: link.text,
          alt: link.alt,
        }));

      if (discoveredLinks.length > 0) {
        try {
          const result = await createScrapeMediaRelationships(
            id,
            discoveredLinks
          );
          console.log(
            `Created ${result.created} relationships, skipped ${result.skipped} duplicates`
          );
        } catch (error) {
          console.error("Failed to create relationships:", error);
          // Don't fail the request if relationship creation fails
        }
      }
    }

    return NextResponse.json({ links: linksWithStatus });
  } catch (error) {
    console.error("Error extracting links:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract links",
      },
      { status: 500 }
    );
  }
}
