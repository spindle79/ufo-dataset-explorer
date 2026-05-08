/**
 * API Route: Find relationships between entities
 * POST /api/graph/relationships
 */

import { NextRequest, NextResponse } from "next/server";
import { suggestRelationships } from "@/lib/neo4j/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityIds, minPathLength } = body;

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length < 2) {
      return NextResponse.json(
        { error: "entityIds must be an array with at least 2 entity IDs" },
        { status: 400 }
      );
    }

    const pathLength = minPathLength || 3;
    const suggestions = await suggestRelationships(entityIds, pathLength);

    return NextResponse.json({
      entityIds,
      relationships: suggestions,
    });
  } catch (error) {
    console.error("Error finding relationships:", error);
    return NextResponse.json(
      {
        error: "Failed to find relationships",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
