import { NextRequest, NextResponse } from "next/server";
import { updateVideoFile, getVideoFileById } from "@/lib/video-access";
import { createClient } from "@/lib/supabase/server";

/**
 * PUT /api/video/[id]/transcript/current
 * Set the current transcript for a video file
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { generationId } = body;

    // Verify the generation exists and belongs to this audio file
    if (generationId) {
      const supabase = await createClient();
      const { data: generation, error } = await supabase
        .from("ai_generations")
        .select("*")
        .eq("id", generationId)
        .eq("source_type", "video")
        .eq("source_id", id)
        .like("generation_type", "transcript-%")
        .single();

      if (error || !generation) {
        return NextResponse.json(
          {
            error:
              "AI generation not found or does not belong to this video file",
          },
          { status: 404 }
        );
      }
    }

    // Update the video file with the current transcript ID
    const updated = await updateVideoFile(id, {
      currentTranscriptId: generationId || null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error setting current transcript:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to set current transcript",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/[id]/transcript/current
 * Get the current transcript for a video file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoFile = await getVideoFileById(id);

    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    if (!videoFile.currentTranscriptId) {
      return NextResponse.json(null);
    }

    const supabase = await createClient();
    const { data: generation, error } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("id", videoFile.currentTranscriptId)
      .single();

    if (error || !generation) {
      return NextResponse.json(
        { error: "Current transcript not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(generation);
  } catch (error) {
    console.error("Error fetching current transcript:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch current transcript",
      },
      { status: 500 }
    );
  }
}
