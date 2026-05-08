/**
 * API Route: Get entity graph
 * GET /api/graph/entities/[id]
 * Returns the full graph context for an entity
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntityGraph } from "@/lib/neo4j/queries";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // First, find the entity in Supabase to determine type
    let entityType: 'Person' | 'Location' | 'Company' | 'Program' | null = null;

    // Check people
    const { data: person } = await supabase
      .from("people")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (person) {
      entityType = 'Person';
    } else {
      // Check locations
      const { data: location } = await supabase
        .from("locations")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (location) {
        entityType = 'Location';
      } else {
        // Check companies
        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (company) {
          entityType = 'Company';
        } else {
          // Check programs
          const { data: program } = await supabase
            .from("programs")
            .select("id")
            .eq("id", id)
            .maybeSingle();

          if (program) {
            entityType = 'Program';
          }
        }
      }
    }

    if (!entityType) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Get graph from Neo4j
    const graph = await getEntityGraph(id, entityType, 2);

    return NextResponse.json({
      entityId: id,
      entityType,
      graph,
    });
  } catch (error) {
    console.error("Error fetching entity graph:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch entity graph",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
