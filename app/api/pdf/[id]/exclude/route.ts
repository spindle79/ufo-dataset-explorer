import { NextRequest, NextResponse } from "next/server";
import { getPdfFileById } from "@/lib/pdf-access";
import { createAdminClient } from "@/lib/supabase/server";
import type { OriginalUploadUpdate } from "@/lib/supabase-types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pdfFile = await getPdfFileById(id);
    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Get current record to preserve existing metadata
    const { data: record, error: recordError } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("id", id)
      .eq("dataset_type", "pdf")
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "PDF file record not found" },
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
      .eq("dataset_type", "pdf")
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to exclude PDF file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error excluding PDF file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to exclude PDF file",
      },
      { status: 500 }
    );
  }
}
