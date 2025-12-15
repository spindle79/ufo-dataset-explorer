import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiGenerationCreate } from "@/lib/supabase-types";

/**
 * GET /api/video/[id]/generations
 * Get all AI generations for a video file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const generationType = searchParams.get("type");

    const supabase = await createClient();
    let query = supabase
      .from("ai_generations")
      .select("*")
      .eq("source_type", "video")
      .eq("source_id", id);

    // If type is specified, filter by it; otherwise get all generations
    if (generationType) {
      query = query.eq("generation_type", generationType);
    } else {
      // Get all transcript-related generations
      query = query.like("generation_type", "transcript-%");
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching AI generations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching AI generations:", error);
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
 * POST /api/video/[id]/generations
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

    const generationData: AiGenerationCreate = {
      source_type: "video",
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
