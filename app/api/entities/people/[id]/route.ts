/**
 * API Route: Get individual person by ID
 * GET /api/entities/people/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Person not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ person: data });
  } catch (error) {
    console.error("Error fetching person:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch person",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

