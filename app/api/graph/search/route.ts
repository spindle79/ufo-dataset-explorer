/**
 * API Route: Search entities in graph
 * POST /api/graph/search
 */

import { NextRequest, NextResponse } from "next/server";
import { findSimilarEntities } from "@/lib/neo4j/queries";
import type { EntityType } from "@/lib/neo4j/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, types, limit } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    const entityTypes: EntityType[] = types || ['Person', 'Location', 'Company', 'Program'];
    const searchLimit = limit || 10;

    const results = await findSimilarEntities(name, entityTypes, searchLimit);

    return NextResponse.json({
      query: name,
      results,
    });
  } catch (error) {
    console.error("Error searching graph:", error);
    return NextResponse.json(
      {
        error: "Failed to search graph",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
