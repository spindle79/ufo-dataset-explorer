import { NextRequest, NextResponse } from "next/server";
import { getVideoFileById } from "@/lib/video-access";
import { createAdminClient } from "@/lib/supabase/server";
import type { OriginalUploadUpdate } from "@/lib/supabase-types";

export async function POST(
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

    const supabase = createAdminClient();

    // Get current record to preserve existing metadata
    const { data: record, error: recordError } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("id", id)
      .eq("dataset_type", "video")
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "Video file record not found" },
        { status: 404 }
      );
    }

    // Merge excluded flag with existing metadata, setting it to false
    const currentMetadata = record.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      excluded: false,
    };

    const updateData: OriginalUploadUpdate = {
      metadata: updatedMetadata,
    };

    const { data: updatedRecord, error: updateError } = await supabase
      .from("original_uploads")
      .update(updateData)
      .eq("id", id)
      .eq("dataset_type", "video")
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to include video file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error including video file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to include video file",
      },
      { status: 500 }
    );
  }
}
