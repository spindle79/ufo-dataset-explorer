/**
 * API Route: Get individual location by ID
 * GET /api/entities/locations/[id]
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
      .from("locations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ location: data });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch location",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

