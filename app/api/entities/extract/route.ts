/**
 * API Route: Extract entities from content
 * POST /api/entities/extract
 *
 * Extracts People, Locations, Companies, and Programs from provided content
 * using GPT-5-nano with strongly enforced Zod schemas
 */

import { NextRequest, NextResponse } from "next/server";
import { extractEntitiesEnhanced } from "@/lib/entity-extraction/enhanced";
import { extractRelationships } from "@/lib/entity-extraction/relationships";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, model } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // Extract entities using enhanced pipeline (model is optional, uses default from config)
    const entities = await extractEntitiesEnhanced(content, model);

    // Extract relationships (model is optional, uses default from config)
    const relationships = await extractRelationships(
      content,
      {
        people: entities.people,
        locations: entities.locations,
        companies: entities.companies,
        programs: entities.programs,
      },
      model
    );

    return NextResponse.json({
      success: true,
      entities: {
        ...entities,
        relationships,
      },
    });
  } catch (error) {
    console.error("Error in entity extraction API:", error);
    return NextResponse.json(
      {
        error: "Failed to extract entities",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
