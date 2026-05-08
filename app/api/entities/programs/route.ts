/**
 * API Route: Programs CRUD operations
 * GET /api/entities/programs - List all programs (optionally filtered by source)
 * POST /api/entities/programs - Create a new program (optionally with source relationship)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { programsEntitySchema } from "@/lib/entity-schemas";
import {
  getOrCreateProgram,
  createProgramRelationship,
  type SourceType,
} from "@/lib/entity-relationships";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("source_type") as SourceType | null;
    const sourceId = searchParams.get("source_id");

    const supabase = createAdminClient();

    // If filtering by source, join with relationships table
    if (sourceType && sourceId) {
      const { data, error } = await supabase
        .from("programs_relationships")
        .select(
          `
          program_id,
          programs (
            id,
            name,
            aliases,
            description,
            created_at,
            updated_at
          )
        `
        )
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Extract programs from relationships
      const programs =
        data
          ?.map((rel: any) => rel.programs)
          .filter((p: any) => p !== null) || [];

      return NextResponse.json({ programs });
    }

    // Otherwise, return all programs
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
    const { source_type, source_id, ...entityData } = body;
    const validated = programsEntitySchema.parse(entityData);

    // Get or create the program
    const programId = await getOrCreateProgram(
      validated.name,
      validated.aliases || [],
      validated.description ?? null
    );

    // Create relationship if source info provided
    if (source_type && source_id) {
      await createProgramRelationship(
        programId,
        source_type as SourceType,
        source_id
      );
    }

    // Fetch the created/updated program
    const supabase = createAdminClient();
    const { data: program, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .single();

    if (error) {
      throw error;
    }

    // Sync to Neo4j if enabled
    if (process.env.ENABLE_NEO4J_SYNC === 'true') {
      try {
        const { syncProgramToNeo4j } = await import('@/lib/neo4j/sync');
        await syncProgramToNeo4j(programId, validated.name, validated.aliases || [], validated.description ?? null);

        // Sync relationship if source info provided
        if (source_type && source_id) {
          const { syncProgramRelationshipToNeo4j } = await import('@/lib/neo4j/sync');
          await syncProgramRelationshipToNeo4j(programId, source_type as SourceType, source_id);
        }
      } catch (neo4jError) {
        console.error('Failed to sync program to Neo4j:', neo4jError);
        // Don't fail the request if Neo4j sync fails
      }
    }

    return NextResponse.json({ program }, { status: 201 });
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
