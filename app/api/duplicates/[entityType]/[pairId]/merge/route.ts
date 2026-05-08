/**
 * API Route: Merge Duplicate Records
 * POST /api/duplicates/[entityType]/[pairId]/merge - Merge two duplicate records
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { EntityType } from "@/lib/deduplication";
import {
  getAudioFileById,
  updateAudioFile,
  deleteAudioFile,
} from "@/lib/audio-access";
import {
  getVideoFileById,
  updateVideoFile,
  deleteVideoFile,
} from "@/lib/video-access";
import {
  getPdfFileById,
  updatePdfFile,
  deletePdfFile,
} from "@/lib/pdf-access";
import {
  getImageFileById,
  updateImageFile,
  deleteImageFile,
} from "@/lib/image-access";
import { getScrapedPageById } from "@/lib/scrape-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; pairId: string }> }
) {
  try {
    const { entityType: entityTypeParam, pairId } = await params;
    const entityType = entityTypeParam as EntityType;
    const body = await request.json();
    const { mergeData } = body; // Object mapping field names to "record1" or "record2"

    if (!mergeData || typeof mergeData !== "object") {
      return NextResponse.json(
        { error: "mergeData is required and must be an object" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the duplicate pair
    const { data: pair, error: pairError } = await supabase
      .from("duplicate_pairs")
      .select("*")
      .eq("id", pairId)
      .single();

    if (pairError || !pair) {
      return NextResponse.json(
        { error: "Duplicate pair not found" },
        { status: 404 }
      );
    }

    const { record1_id, record2_id } = pair;

    // Fetch both records
    let record1: any;
    let record2: any;

    if (
      entityType === "audio" ||
      entityType === "video" ||
      entityType === "pdf" ||
      entityType === "image"
    ) {
      // File-based types
      if (entityType === "audio") {
        record1 = await getAudioFileById(record1_id);
        record2 = await getAudioFileById(record2_id);
      } else if (entityType === "video") {
        record1 = await getVideoFileById(record1_id);
        record2 = await getVideoFileById(record2_id);
      } else if (entityType === "pdf") {
        record1 = await getPdfFileById(record1_id);
        record2 = await getPdfFileById(record2_id);
      } else if (entityType === "image") {
        record1 = await getImageFileById(record1_id);
        record2 = await getImageFileById(record2_id);
      }
    } else if (entityType === "people" || entityType === "locations" || entityType === "companies" || entityType === "programs") {
      const tableName =
        entityType === "people"
          ? "people"
          : entityType === "locations"
          ? "locations"
          : entityType === "companies"
          ? "companies"
          : "programs";

      const { data: data1 } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", record1_id)
        .single();
      const { data: data2 } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", record2_id)
        .single();

      record1 = data1;
      record2 = data2;
    } else if (entityType === "scrape") {
      record1 = await getScrapedPageById(record1_id);
      record2 = await getScrapedPageById(record2_id);
    }

    if (!record1 || !record2) {
      return NextResponse.json(
        { error: "One or both records not found" },
        { status: 404 }
      );
    }

    // Build merged record based on mergeData
    const mergedRecord: any = {};
    const allFields = new Set([
      ...Object.keys(record1),
      ...Object.keys(record2),
    ]);

    for (const field of allFields) {
      if (field === "id" || field === "created_at" || field === "updated_at") {
        // Keep record1's id and timestamps
        if (field === "id") {
          mergedRecord[field] = record1[field];
        } else {
          mergedRecord[field] = record1[field];
        }
      } else if (mergeData[field]) {
        // Use the specified record's value
        const sourceRecord = mergeData[field] === "record1" ? record1 : record2;
        mergedRecord[field] = sourceRecord[field];
      } else {
        // Default: prefer record1, but use record2 if record1 is null/empty
        if (record1[field] !== null && record1[field] !== undefined && record1[field] !== "") {
          mergedRecord[field] = record1[field];
        } else {
          mergedRecord[field] = record2[field];
        }
      }
    }

    // Update record1 with merged data
    if (
      entityType === "audio" ||
      entityType === "video" ||
      entityType === "pdf" ||
      entityType === "image"
    ) {
      // Build update object with only updatable fields
      const updateData: any = {
        fileName: mergedRecord.fileName,
        description: mergedRecord.description,
        categories: mergedRecord.categories,
      };

      if (entityType === "audio") {
        if (mergedRecord.currentTranscriptId !== undefined) {
          updateData.currentTranscriptId = mergedRecord.currentTranscriptId;
        }
        await updateAudioFile(record1_id, updateData);
        await deleteAudioFile(record2_id);
      } else if (entityType === "video") {
        if (mergedRecord.currentTranscriptId !== undefined) {
          updateData.currentTranscriptId = mergedRecord.currentTranscriptId;
        }
        await updateVideoFile(record1_id, updateData);
        await deleteVideoFile(record2_id);
      } else if (entityType === "pdf") {
        if (mergedRecord.currentExtractionId !== undefined) {
          updateData.currentExtractionId = mergedRecord.currentExtractionId;
        }
        await updatePdfFile(record1_id, updateData);
        await deletePdfFile(record2_id);
      } else if (entityType === "image") {
        if (mergedRecord.currentDescriptionId !== undefined) {
          updateData.currentDescriptionId = mergedRecord.currentDescriptionId;
        }
        await updateImageFile(record1_id, updateData);
        await deleteImageFile(record2_id);
      }
    } else if (entityType === "people" || entityType === "locations" || entityType === "companies" || entityType === "programs") {
      const tableName =
        entityType === "people"
          ? "people"
          : entityType === "locations"
          ? "locations"
          : entityType === "companies"
          ? "companies"
          : "programs";

      // Update record1
      const { error: updateError } = await supabase
        .from(tableName)
        .update(mergedRecord)
        .eq("id", record1_id);

      if (updateError) throw updateError;

      // Update relationships to point to record1
      // This would need to be done for each relationship table
      // For now, we'll just delete record2
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", record2_id);

      if (deleteError) throw deleteError;
    } else if (entityType === "scrape") {
      // Update scraped page
      const { error: updateError } = await supabase
        .from("scraped_pages")
        .update(mergedRecord)
        .eq("id", record1_id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from("scraped_pages")
        .delete()
        .eq("id", record2_id);

      if (deleteError) throw deleteError;
    }

    // Update duplicate pair status
    const { error: pairUpdateError } = await supabase
      .from("duplicate_pairs")
      .update({
        status: "merged",
        merge_data: mergeData,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", pairId);

    if (pairUpdateError) throw pairUpdateError;

    return NextResponse.json({
      success: true,
      message: "Records merged successfully",
      mergedRecordId: record1_id,
      deletedRecordId: record2_id,
    });
  } catch (error) {
    console.error("Error merging records:", error);
    return NextResponse.json(
      { error: "Failed to merge records" },
      { status: 500 }
    );
  }
}

