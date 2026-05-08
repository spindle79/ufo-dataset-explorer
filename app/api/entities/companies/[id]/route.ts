/**
 * API Route: Get individual company by ID
 * GET /api/entities/companies/[id]
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
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ company: data });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch company",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

