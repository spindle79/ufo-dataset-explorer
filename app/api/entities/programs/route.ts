/**
 * API Route: Programs CRUD operations
 * GET /api/entities/programs - List all programs
 * POST /api/entities/programs - Create a new program
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { programsEntitySchema } from "@/lib/entity-schemas";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ programs: data || [] });
  } catch (error) {
    console.error("Error fetching programs:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    if (
      errorMessage.includes("relation") &&
      errorMessage.includes("does not exist")
    ) {
      return NextResponse.json(
        {
          error: "Database table not found",
          message:
            "The 'programs' table does not exist. Please run the database migration: supabase/db/init/013_create_people_locations_companies_programs.sql",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch programs",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = programsEntitySchema.parse(body);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("programs")
      .insert(validated)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ program: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating program:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create program",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
