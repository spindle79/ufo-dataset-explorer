import { NextRequest, NextResponse } from "next/server";
import { getScrapedPageById, getScrapedPageHtml } from "@/lib/scrape-access";
import {
  extractLinksFromHtml,
  type ExtractedLink,
} from "@/lib/scrape-link-extractor";
import {
  createScrapeMediaRelationships,
  getMediaForScrapedPage,
  type DiscoveredLink,
} from "@/lib/scrape-media-relationships";

/**
 * POST /api/scrape/[id]/links/relationships
 * Create relationships between a scraped page and discovered media files
 * This creates original_uploads records (if they don't exist) and establishes relationships
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the scraped page
    const page = await getScrapedPageById(id);
    if (!page) {
      return NextResponse.json(
        { error: "Scraped page not found" },
        { status: 404 }
      );
    }

    // Get the HTML to extract links
    const html = await getScrapedPageHtml(id);
    if (!html) {
      return NextResponse.json(
        { error: "HTML content not found" },
        { status: 404 }
      );
    }

    // Extract links
    const extractedLinks = extractLinksFromHtml(html, page.url);

    // Filter to only audio, PDF, and video links
    const mediaLinks: DiscoveredLink[] = extractedLinks
      .filter(
        (link) =>
          link.type === "audio" || link.type === "pdf" || link.type === "video"
      )
      .map((link) => ({
        url: link.url,
        type: link.type as "audio" | "pdf" | "video",
        text: link.text,
        alt: link.alt,
      }));

    if (mediaLinks.length === 0) {
      return NextResponse.json({
        message: "No audio, PDF, or video links found",
        created: 0,
        skipped: 0,
      });
    }

    // Create relationships
    const result = await createScrapeMediaRelationships(id, mediaLinks);

    return NextResponse.json({
      message: `Created ${result.created} relationships, skipped ${result.skipped} duplicates`,
      created: result.created,
      skipped: result.skipped,
      total: mediaLinks.length,
    });
  } catch (error) {
    console.error("Error creating relationships:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create relationships",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scrape/[id]/links/relationships
 * Get all media files discovered from a scraped page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the scraped page
    const page = await getScrapedPageById(id);
    if (!page) {
      return NextResponse.json(
        { error: "Scraped page not found" },
        { status: 404 }
      );
    }

    // Get media relationships
    const media = await getMediaForScrapedPage(id);

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error getting relationships:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get relationships",
      },
      { status: 500 }
    );
  }
}
