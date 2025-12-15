import { NextRequest, NextResponse } from "next/server";
import { getImageFileById } from "@/lib/image-access";
import { createClient } from "@/lib/supabase/server";
import type { AiGenerationCreate } from "@/lib/supabase-types";

/**
 * GET /api/image/[id]/generations
 * Get all AI generations for an image
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify image exists
    const imageFile = await getImageFileById(id);
    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const { data: generations, error } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("source_type", "image")
      .eq("source_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching AI generations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(generations || []);
  } catch (error) {
    console.error("Error in generations endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch AI generations",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/image/[id]/generations
 * Save a new AI generation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text_content, metadata, documents, version, generation_type } =
      body;

    if (!text_content && !documents) {
      return NextResponse.json(
        { error: "Either text_content or documents must be provided" },
        { status: 400 }
      );
    }

    if (!generation_type) {
      return NextResponse.json(
        { error: "generation_type is required" },
        { status: 400 }
      );
    }

    // Verify image exists
    const imageFile = await getImageFileById(id);
    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    const generationData: AiGenerationCreate = {
      source_type: "image",
      source_id: id,
      generation_type: generation_type,
      version: version || 1,
      text_content: text_content || null,
      documents: documents || {},
      metadata: metadata || {},
    };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_generations")
      .insert(generationData)
      .select()
      .single();

    if (error) {
      console.error("Error saving AI generation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving AI generation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save AI generation",
      },
      { status: 500 }
    );
  }
}
