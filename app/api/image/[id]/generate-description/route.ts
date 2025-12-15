import { NextRequest, NextResponse } from "next/server";
import {
  getImageFileById,
  getImageFileBuffer,
  updateImageFile,
} from "@/lib/image-access";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import {
  getNextGenerationVersion,
  createGenerationData,
  generateGenerationType,
} from "@/lib/ai-generation-utils";

/**
 * POST /api/image/[id]/generate-description
 * Generate a detailed transcription/description for an image using OpenAI vision API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const model = body.model || "gpt-5-mini";
    const saveAsDescription = body.saveAsDescription !== false; // Default to true

    // Get the image file
    const imageFile = await getImageFileById(id);
    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    // Get the image buffer
    const imageBuffer = await getImageFileBuffer(id);
    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Image file data not found" },
        { status: 404 }
      );
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Convert buffer to base64 for OpenAI vision API
    const base64Image = imageBuffer.toString("base64");
    const mimeType = imageFile.mimeType || "image/jpeg";

    // Create a detailed prompt that emphasizes text extraction and detailed description
    const systemPrompt = `You are a detailed image analysis and text extraction assistant. Your task is to extract all text from images and provide a comprehensive description that would allow someone to recreate the image from scratch without ever seeing it.`;

    const userPrompt = `Analyze this image and provide a comprehensive transcription and description.

CRITICAL REQUIREMENTS:

1. TEXT EXTRACTION (HIGHEST PRIORITY):
   - Extract ALL text visible in the image exactly as it appears
   - Include text from: signs, labels, captions, handwritten text, printed text, documents, screens, menus, etc.
   - Be precise with spelling, punctuation, capitalization, formatting, and line breaks
   - Preserve the original text structure and formatting where possible
   - Output the extracted text prominently and clearly

2. DOCUMENT STRUCTURE (for scanned documents):
   - If this appears to be a scanned document, identify and organize content into sections:
     * HEADER: Top section with titles, headers, logos, dates, etc.
     * BODY: Main content area
     * FOOTER: Bottom section with footnotes, page numbers, etc.
     * SIDEBAR: Side columns or margin content
     * OTHER: Any other distinct sections (table of contents, appendices, etc.)
   - Clearly label each section and extract text within that context

3. MULTI-COLUMN LAYOUTS (for newspaper-style or multi-column documents):
   - If the image has multiple columns (like a newspaper, magazine, or multi-column document):
     * DO NOT read column by column separately
     * Instead, combine columns into a SINGLE, LINEAR, READABLE FLOW
     * Read left-to-right, top-to-bottom across the entire width before moving down
     * This makes the text easier to read as a continuous narrative
   - Example: For a 2-column layout, read the first line across both columns, then the second line across both columns, etc.

4. VISUAL DESCRIPTION:
   - Describe the overall composition and layout
   - Note colors, textures, materials, and visual elements
   - Describe spatial relationships and positioning
   - Note lighting, shadows, and visual quality
   - Include context clues (location, time period, purpose)

OUTPUT FORMAT:
Structure your response as follows:

=== EXTRACTED TEXT ===
[All text from the image, organized by sections if applicable]

=== VISUAL DESCRIPTION ===
[Detailed visual description of the image]

Begin your analysis now:`;

    // Generate description using OpenAI vision API
    let description: string;
    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_completion_tokens: 8000, // Allow for detailed descriptions and full text extraction
      });

      description = response.choices[0]?.message?.content?.trim() || "";

      if (!description) {
        throw new Error("Empty description response from OpenAI");
      }
    } catch (error) {
      console.error("Error generating image description:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate image description",
        },
        { status: 500 }
      );
    }

    // Save as AI generation
    // Include model in generation type to track different models
    const generationType = generateGenerationType(
      "description",
      `openai-vision-${model}`
    );
    const nextVersion = await getNextGenerationVersion(
      "image",
      id,
      generationType
    );

    const generationData = createGenerationData(
      "image",
      id,
      generationType,
      nextVersion,
      description,
      {
        model,
        service: "openai-vision",
        mimeType,
        fileName: imageFile.fileName,
      }
    );

    const supabase = await createClient();
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .insert(generationData)
      .select()
      .single();

    if (genError) {
      console.error("Error saving AI generation:", genError);
      // Continue even if saving generation fails
    }

    // Optionally set as current description (default: true if saveAsDescription is true)
    const setAsCurrent = body.setAsCurrent !== false && saveAsDescription;
    if (setAsCurrent && generation) {
      try {
        await updateImageFile(id, {
          currentDescriptionId: generation.id,
        });
      } catch (updateError) {
        console.error("Error setting current description:", updateError);
        // Don't fail the request if setting current fails
      }
    }

    // Optionally update the image file description field
    if (saveAsDescription) {
      try {
        await updateImageFile(id, { description });
      } catch (error) {
        console.error("Error updating image description:", error);
        // Don't fail the request if this fails
      }
    }

    return NextResponse.json({
      success: true,
      text: description,
      description,
      version: nextVersion,
      service: model,
      metadata: {
        model,
        service: "openai-vision",
        mimeType,
        fileName: imageFile.fileName,
      },
      generationData: generationData,
      generation: generation || null,
      generationId: generation?.id || null,
      saved: !!generation,
      isCurrent: setAsCurrent,
      savedAsDescription: saveAsDescription,
    });
  } catch (error) {
    console.error("Error in generate-description endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate image description",
      },
      { status: 500 }
    );
  }
}
