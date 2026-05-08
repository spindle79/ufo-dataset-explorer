/**
 * API Route: Get relationship suggestions
 * POST /api/graph/suggestions
 */

import { NextRequest, NextResponse } from "next/server";
import { suggestRelationships, findSimilarEntities } from "@/lib/neo4j/queries";
import type { EntityExtractionResponse } from "@/lib/entity-schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entities } = body as { entities: EntityExtractionResponse };

    if (!entities) {
      return NextResponse.json(
        { error: "entities is required" },
        { status: 400 }
      );
    }

    // Extract entity names
    const allEntityNames = [
      ...entities.people.map((p) => p.name),
      ...entities.locations.map((l) => l.name),
      ...entities.companies.map((c) => c.name),
      ...entities.programs.map((p) => p.name),
    ];

    // Find similar entities in graph
    const similarEntitiesMap = new Map<string, string>();
    for (const name of allEntityNames) {
      try {
        const similar = await findSimilarEntities(name, ['Person', 'Location', 'Company', 'Program'], 1);
        if (similar.length > 0) {
          similarEntitiesMap.set(name, similar[0].id);
        }
      } catch (error) {
        console.warn(`Failed to find similar entity for ${name}:`, error);
      }
    }

    // Get entity IDs
    const entityIds = Array.from(similarEntitiesMap.values());

    if (entityIds.length < 2) {
      return NextResponse.json({
        suggestions: [],
        message: "Not enough entities found in graph to suggest relationships",
      });
    }

    // Find relationships
    const suggestions = await suggestRelationships(entityIds, 3);

    return NextResponse.json({
      suggestions,
      entityMapping: Object.fromEntries(similarEntitiesMap),
    });
  } catch (error) {
    console.error("Error getting relationship suggestions:", error);
    return NextResponse.json(
      {
        error: "Failed to get relationship suggestions",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
