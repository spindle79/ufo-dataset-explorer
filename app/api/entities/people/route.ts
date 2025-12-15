/**
 * API Route: People CRUD operations
 * GET /api/entities/people - List all people
 * POST /api/entities/people - Create a new person
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { peopleEntitySchema } from "@/lib/entity-schemas";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ people: data || [] });
  } catch (error) {
    console.error("Error fetching people:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    // Check if it's a table doesn't exist error
    if (
      errorMessage.includes("relation") &&
      errorMessage.includes("does not exist")
    ) {
      return NextResponse.json(
        {
          error: "Database table not found",
          message:
            "The 'people' table does not exist. Please run the database migration: supabase/db/init/013_create_people_locations_companies_programs.sql",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch people",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = peopleEntitySchema.parse(body);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("people")
      .insert(validated)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ person: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating person:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create person",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
