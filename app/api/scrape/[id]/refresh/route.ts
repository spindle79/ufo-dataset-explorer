import { NextRequest, NextResponse } from "next/server";
import { getScrapedPageById, updateScrapedPage } from "@/lib/scrape-access";
import { scrapePage } from "@/lib/scrape-utils";
import {
  STORAGE_BUCKETS,
  uploadFile,
  deleteFile,
} from "@/lib/supabase-storage";
import { extractLinksFromHtml } from "@/lib/scrape-link-extractor";
import { createScrapeMediaRelationships } from "@/lib/scrape-media-relationships";
import { getCanonicalUrl } from "@/lib/url-utils";

const SCRAPED_PAGES_BUCKET = STORAGE_BUCKETS.SCRAPED_PAGES;

function getStoragePath(id: string, type: "markdown" | "html"): string {
  return `scraped-pages/${id}/${
    type === "markdown" ? "content.md" : "content.html"
  }`;
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scrapedPage = await getScrapedPageById(id);

    if (!scrapedPage) {
      return NextResponse.json(
        { error: "Scraped page not found" },
        { status: 404 }
      );
    }

    // Re-scrape the page
    const pageContent = await scrapePage(scrapedPage.url);

    // Check if scraping actually failed
    const hasError = pageContent.markdown.includes("Error scraping page:");
    const errorMessage = hasError
      ? pageContent.markdown.replace("Error scraping page: ", "").trim()
      : undefined;

    // Delete old files from storage
    try {
      if (scrapedPage.markdown_path) {
        await deleteFile(SCRAPED_PAGES_BUCKET, scrapedPage.markdown_path, true);
      }
      if (scrapedPage.html_path) {
        await deleteFile(SCRAPED_PAGES_BUCKET, scrapedPage.html_path, true);
      }
    } catch (error) {
      // Log but continue if deletion fails
      console.warn("Failed to delete old storage files:", error);
    }

    // Upload new markdown to storage
    const markdownPath = getStoragePath(id, "markdown");
    const markdownBuffer = Buffer.from(pageContent.markdown, "utf-8");
    await uploadFile(SCRAPED_PAGES_BUCKET, markdownPath, markdownBuffer, {
      contentType: "text/markdown",
      useAdmin: true,
    });

    // Upload new HTML to storage if available
    let htmlPath: string | null = null;
    if (pageContent.rawHtml && pageContent.rawHtml.length > 0) {
      htmlPath = getStoragePath(id, "html");
      const htmlBuffer = Buffer.from(pageContent.rawHtml, "utf-8");
      await uploadFile(SCRAPED_PAGES_BUCKET, htmlPath, htmlBuffer, {
        contentType: "text/html",
        useAdmin: true,
      });
    }

    // Update database record
    const fileSize = markdownBuffer.length;
    const domain = extractDomain(scrapedPage.url);
    const canonicalUrl = getCanonicalUrl(scrapedPage.url);

    const updated = await updateScrapedPage(id, {
      title: pageContent.title || scrapedPage.title,
      markdown_path: markdownPath,
      html_path: htmlPath,
      file_size: fileSize,
      error: errorMessage || null,
      domain: domain,
      canonical_url: canonicalUrl,
    });

    if (!updated) {
      throw new Error("Failed to update scraped page");
    }

    // Process links and create relationships for newly discovered media files
    // This won't lose existing relationships due to UNIQUE constraint
    let relationshipsCreated = { created: 0, skipped: 0 };
    if (pageContent.rawHtml && !hasError) {
      try {
        const extractedLinks = extractLinksFromHtml(
          pageContent.rawHtml,
          scrapedPage.url
        );

        // Filter to only audio, PDF, and video links
        const mediaLinks = extractedLinks
          .filter(
            (link) =>
              link.type === "audio" ||
              link.type === "pdf" ||
              link.type === "video"
          )
          .map((link) => ({
            url: link.url,
            type: link.type as "audio" | "pdf" | "video",
            text: link.text,
            alt: link.alt,
          }));

        if (mediaLinks.length > 0) {
          relationshipsCreated = await createScrapeMediaRelationships(
            id,
            mediaLinks
          );
        }
      } catch (linkError) {
        // Log but don't fail the refresh if link processing fails
        console.error("Error processing links during refresh:", linkError);
      }
    }

    return NextResponse.json({
      ...updated,
      relationshipsCreated: relationshipsCreated.created,
      relationshipsSkipped: relationshipsCreated.skipped,
    });
  } catch (error) {
    console.error("Error refreshing scraped page:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh scraped page",
      },
      { status: 500 }
    );
  }
}
