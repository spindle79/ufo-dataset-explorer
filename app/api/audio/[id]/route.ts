import { NextRequest, NextResponse } from "next/server";
import { getAudioFileById, updateAudioFile } from "@/lib/audio-access";
import { createAdminClient } from "@/lib/supabase/server";
import type { OriginalUploadUpdate } from "@/lib/supabase-types";

/**
 * GET /api/audio/[id]
 * Get an audio file by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const audioFile = await getAudioFileById(id);

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(audioFile);
  } catch (error) {
    console.error("Error fetching audio file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch audio file",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const audioFile = await getAudioFileById(id);
    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Get current record to preserve existing metadata
    const { data: record, error: recordError } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("id", id)
      .eq("dataset_type", "audio")
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "Audio file record not found" },
        { status: 404 }
      );
    }

    // Merge metadata updates with existing metadata
    const currentMetadata = record.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(body.metadata || {}),
    };

    const updateData: OriginalUploadUpdate = {
      metadata: updatedMetadata,
    };

    if (body.fileName !== undefined) {
      updateData.file_name = body.fileName;
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from("original_uploads")
      .update(updateData)
      .eq("id", id)
      .eq("dataset_type", "audio")
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to update audio file" },
        { status: 500 }
      );
    }

    // Use updateAudioFile to convert back to AudioFile format
    // But we've already updated, so just fetch it
    const updatedFile = await getAudioFileById(id);
    if (!updatedFile) {
      return NextResponse.json(
        { error: "Failed to retrieve updated file" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error("Error updating audio file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update audio file",
      },
      { status: 500 }
    );
  }
}
