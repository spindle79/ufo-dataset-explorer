import { NextRequest, NextResponse } from "next/server";
import { getPdfFileById, getPdfFileBuffer } from "@/lib/pdf-access";
import {
  extractLinksFromPdf,
  type ExtractedLink,
} from "@/lib/pdf-link-extractor";
import { createAdminClient } from "@/lib/supabase/server";
import { getCanonicalUrl } from "@/lib/url-utils";

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
 * GET /api/pdf/[id]/links
 * Extract links and images from the PDF file and check if they're already processed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the PDF file to get the original URL (for resolving relative URLs)
    const pdfFile = await getPdfFileById(id);
    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    // Get the PDF file buffer
    const pdfBuffer = await getPdfFileBuffer(id);
    if (!pdfBuffer) {
      return NextResponse.json(
        { error: "PDF file data not found" },
        { status: 404 }
      );
    }

    // Extract links and images from PDF
    // Use original URL as base URL for resolving relative URLs
    const baseUrl = pdfFile.originalUrl || `https://example.com/pdf/${id}`;
    const extractedLinks = await extractLinksFromPdf(pdfBuffer, baseUrl);

    // Check which URLs are already processed using database indexes
    // Each lookup uses O(log n) index queries instead of O(n) scans
    // We can run these in parallel for better performance
    // Skip data URLs and PDF image references (pdf-image://)
    const linksWithStatus: LinkWithStatus[] = await Promise.all(
      extractedLinks
        .filter((link) => {
          // Skip data URLs and internal PDF image references
          return (
            !link.url.startsWith("data:") &&
            !link.url.startsWith("pdf-image://")
          );
        })
        .map(async (link: ExtractedLink) => {
          const existingRecord = await checkUrlExists(link.url);
          return {
            ...link,
            existingRecord: existingRecord || undefined,
          };
        })
    );

    // Add back PDF image references (they don't need URL checking)
    const imageReferences = extractedLinks.filter((link) =>
      link.url.startsWith("pdf-image://")
    );
    const allLinks: LinkWithStatus[] = [
      ...linksWithStatus,
      ...imageReferences.map((link) => ({
        ...link,
        existingRecord: undefined,
      })),
    ];

    return NextResponse.json({ links: allLinks });
  } catch (error) {
    console.error("Error extracting links from PDF:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract links from PDF",
      },
      { status: 500 }
    );
  }
}
