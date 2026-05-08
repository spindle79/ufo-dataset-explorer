/**
 * API Route: Get individual program by ID
 * GET /api/entities/programs/[id]
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
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ program: data });
  } catch (error) {
    console.error("Error fetching program:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch program",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

