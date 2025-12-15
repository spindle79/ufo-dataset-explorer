import { NextRequest, NextResponse } from "next/server";
import { getAudioFileById } from "@/lib/audio-access";
import { createAdminClient } from "@/lib/supabase/server";
import type { OriginalUploadUpdate } from "@/lib/supabase-types";

export async function POST(
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

    // Merge excluded flag with existing metadata
    const currentMetadata = record.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      excluded: true,
    };

    const updateData: OriginalUploadUpdate = {
      metadata: updatedMetadata,
    };

    const { data: updatedRecord, error: updateError } = await supabase
      .from("original_uploads")
      .update(updateData)
      .eq("id", id)
      .eq("dataset_type", "audio")
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to exclude audio file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error excluding audio file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to exclude audio file",
      },
      { status: 500 }
    );
  }
}
