import { NextRequest, NextResponse } from "next/server";
import { getPdfFileById, updatePdfFile } from "@/lib/pdf-access";
import { generateDescription } from "@/lib/openai-description";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/pdf/[id]/generate-description
 * Generate a description for a PDF file using OpenAI gpt-5-nano
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const model = body.model || "gpt-5-nano";

    // Get the PDF file
    const pdfFile = await getPdfFileById(id);
    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    // Check if extraction is available
    let content: string | null = null;

    // Try to get content from current extraction first
    if (pdfFile.currentExtractionId) {
      const supabase = await createClient();
      const { data: generation, error: genError } = await supabase
        .from("ai_generations")
        .select("*")
        .eq("id", pdfFile.currentExtractionId)
        .single();

      if (!genError && generation && generation.text_content) {
        content = generation.text_content;
      }
    }

    // Fallback to extractedText field if available
    if (!content && pdfFile.extractedText) {
      content = pdfFile.extractedText;
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "No extracted text available for this PDF file. Please extract text from the PDF first.",
        },
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

    // Update the PDF file with the generated description
    const updated = await updatePdfFile(id, { description });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update PDF file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      description,
      file: updated,
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
