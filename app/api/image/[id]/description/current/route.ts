import { NextRequest, NextResponse } from "next/server";
import { updateImageFile, getImageFileById } from "@/lib/image-access";
import { createClient } from "@/lib/supabase/server";

/**
 * PUT /api/image/[id]/description/current
 * Set the current description for an image file
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { generationId } = body;

    // Verify the generation exists and belongs to this image file
    if (generationId) {
      const supabase = await createClient();
      const { data: generation, error } = await supabase
        .from("ai_generations")
        .select("*")
        .eq("id", generationId)
        .eq("source_type", "image")
        .eq("source_id", id)
        .like("generation_type", "description-%")
        .single();

      if (error || !generation) {
        return NextResponse.json(
          {
            error:
              "AI generation not found or does not belong to this image file",
          },
          { status: 404 }
        );
      }
    }

    // Update the image file with the current description ID
    const updated = await updateImageFile(id, {
      currentDescriptionId: generationId || null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error setting current description:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to set current description",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/image/[id]/description/current
 * Get the current description for an image file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const imageFile = await getImageFileById(id);

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    const currentDescriptionId = (imageFile as any).currentDescriptionId;
    if (!currentDescriptionId) {
      return NextResponse.json(null);
    }

    const supabase = await createClient();
    const { data: generation, error } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("id", currentDescriptionId)
      .single();

    if (error || !generation) {
      return NextResponse.json(
        { error: "Current description not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(generation);
  } catch (error) {
    console.error("Error fetching current description:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch current description",
      },
      { status: 500 }
    );
  }
}
