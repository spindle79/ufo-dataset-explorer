/**
 * API Route: Locations CRUD operations
 * GET /api/entities/locations - List all locations (optionally filtered by source)
 * POST /api/entities/locations - Create a new location (optionally with source relationship)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { locationsEntitySchema } from "@/lib/entity-schemas";
import {
  getOrCreateLocation,
  createLocationRelationship,
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
        .from("locations_relationships")
        .select(
          `
          location_id,
          locations (
            id,
            name,
            aliases,
            latitude,
            longitude,
            address,
            city,
            state,
            country,
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

      // Extract locations from relationships
      const locations =
        data
          ?.map((rel: any) => rel.locations)
          .filter((l: any) => l !== null) || [];

      return NextResponse.json({ locations });
    }

    // Otherwise, return all locations
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ locations: data || [] });
  } catch (error) {
    console.error("Error fetching locations:", error);
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
            "The 'locations' table does not exist. Please run the database migration: supabase/db/init/013_create_people_locations_companies_programs.sql",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch locations",
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
    const validated = locationsEntitySchema.parse(entityData);

    // Get or create the location
    const locationId = await getOrCreateLocation(
      validated.name,
      validated.aliases || [],
      {
        latitude: validated.latitude ?? null,
        longitude: validated.longitude ?? null,
        address: validated.address ?? null,
        city: validated.city ?? null,
        state: validated.state ?? null,
        country: validated.country ?? null,
      }
    );

    // Create relationship if source info provided
    if (source_type && source_id) {
      await createLocationRelationship(
        locationId,
        source_type as SourceType,
        source_id
      );
    }

    // Fetch the created/updated location
    const supabase = createAdminClient();
    const { data: location, error } = await supabase
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (error) {
      throw error;
    }

    // Sync to Neo4j if enabled
    if (process.env.ENABLE_NEO4J_SYNC === 'true') {
      try {
        const { syncLocationToNeo4j } = await import('@/lib/neo4j/sync');
        await syncLocationToNeo4j(
          locationId,
          validated.name,
          validated.aliases || [],
          {
            latitude: validated.latitude ?? null,
            longitude: validated.longitude ?? null,
            address: validated.address ?? null,
            city: validated.city ?? null,
            state: validated.state ?? null,
            country: validated.country ?? null,
          }
        );

        // Sync relationship if source info provided
        if (source_type && source_id) {
          const { syncLocationRelationshipToNeo4j } = await import('@/lib/neo4j/sync');
          await syncLocationRelationshipToNeo4j(locationId, source_type as SourceType, source_id);
        }
      } catch (neo4jError) {
        console.error('Failed to sync location to Neo4j:', neo4jError);
        // Don't fail the request if Neo4j sync fails
      }
    }

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create location",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
