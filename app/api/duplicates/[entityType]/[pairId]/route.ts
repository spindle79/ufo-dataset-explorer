/**
 * API Route: Duplicate Pair Management
 * PATCH /api/duplicates/[entityType]/[pairId] - Update duplicate pair status
 *   Actions: mark-not-duplicate, skip, merge
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { DuplicatePairUpdate } from "@/lib/supabase-types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; pairId: string }> }
) {
  try {
    const { pairId } = await params;
    const body = await request.json();
    const { action, mergeData } = body;

    const supabase = createAdminClient();

    let updateData: DuplicatePairUpdate = {
      reviewed_at: new Date().toISOString(),
    };

    if (action === "mark-not-duplicate") {
      updateData.status = "not_duplicate";
    } else if (action === "skip") {
      updateData.status = "skipped";
    } else if (action === "merge") {
      if (!mergeData) {
        return NextResponse.json(
          { error: "mergeData is required for merge action" },
          { status: 400 }
        );
      }
      updateData.status = "merged";
      updateData.merge_data = mergeData;

      // Perform the actual merge
      // This will be implemented based on entity type
      // For now, we'll just update the status
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("duplicate_pairs")
      .update(updateData)
      .eq("id", pairId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, pair: data });
  } catch (error) {
    console.error("Error updating duplicate pair:", error);
    return NextResponse.json(
      { error: "Failed to update duplicate pair" },
      { status: 500 }
    );
  }
}

