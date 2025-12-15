import { NextRequest, NextResponse } from "next/server";
import {
  getScrapedPageById,
  getScrapedPageContent,
  updateScrapedPage,
} from "@/lib/scrape-access";
import { generateDescription } from "@/lib/openai-description";

/**
 * POST /api/scrape/[id]/generate-description
 * Generate a description for a scraped page using OpenAI gpt-5-nano
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const model = body.model || "gpt-5-nano";

    // Get the scraped page
    const scrapedPage = await getScrapedPageById(id);
    if (!scrapedPage) {
      return NextResponse.json(
        { error: "Scraped page not found" },
        { status: 404 }
      );
    }

    // Check if content is available
    if (!scrapedPage.markdown_path) {
      return NextResponse.json(
        {
          error:
            "No content available for this page. Please scrape the page first.",
        },
        { status: 400 }
      );
    }

    // Fetch the content
    const content = await getScrapedPageContent(id);
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is empty or unavailable" },
        { status: 400 }
      );
    }

    // Generate description using OpenAI
    let description: string;
    try {
      description = await generateDescription(content, model);
    } catch (error) {
      console.error("Error generating description:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate description",
        },
        { status: 500 }
      );
    }

    // Update the scraped page with the generated description
    const updated = await updateScrapedPage(id, { description });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update scraped page" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      description,
      page: updated,
    });
  } catch (error) {
    console.error("Error in generate-description endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate description",
      },
      { status: 500 }
    );
  }
}
