/**
 * API Route: People CRUD operations
 * GET /api/entities/people - List all people (optionally filtered by source)
 * POST /api/entities/people - Create a new person (optionally with source relationship)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { peopleEntitySchema } from "@/lib/entity-schemas";
import {
  getOrCreatePerson,
  createPersonRelationship,
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
        .from("people_relationships")
        .select(
          `
          person_id,
          people (
            id,
            name,
            aliases,
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

      // Extract people from relationships
      const people =
        data
          ?.map((rel: any) => rel.people)
          .filter((p: any) => p !== null) || [];

      return NextResponse.json({ people });
    }

    // Otherwise, return all people
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
    const { source_type, source_id, ...entityData } = body;
    const validated = peopleEntitySchema.parse(entityData);

    // Get or create the person
    const personId = await getOrCreatePerson(
      validated.name,
      validated.aliases || []
    );

    // Create relationship if source info provided
    if (source_type && source_id) {
      await createPersonRelationship(
        personId,
        source_type as SourceType,
        source_id
      );
    }

    // Fetch the created/updated person
    const supabase = createAdminClient();
    const { data: person, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", personId)
      .single();

    if (error) {
      throw error;
    }

    // Sync to Neo4j if enabled
    if (process.env.ENABLE_NEO4J_SYNC === 'true') {
      try {
        const { syncPersonToNeo4j } = await import('@/lib/neo4j/sync');
        await syncPersonToNeo4j(personId, validated.name, validated.aliases || []);

        // Sync relationship if source info provided
        if (source_type && source_id) {
          const { syncPersonRelationshipToNeo4j } = await import('@/lib/neo4j/sync');
          await syncPersonRelationshipToNeo4j(personId, source_type as SourceType, source_id);
        }
      } catch (neo4jError) {
        console.error('Failed to sync person to Neo4j:', neo4jError);
        // Don't fail the request if Neo4j sync fails
      }
    }

    return NextResponse.json({ person }, { status: 201 });
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
