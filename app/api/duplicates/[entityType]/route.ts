/**
 * API Route: Duplicate Management
 * GET /api/duplicates/[entityType] - Get pending duplicates for an entity type
 * POST /api/duplicates/[entityType]/find - Find and create potential duplicate pairs
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getPendingDuplicates,
  findPotentialDuplicates,
  type EntityType,
} from "@/lib/deduplication";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const { entityType: entityTypeParam } = await params;
    const entityType = entityTypeParam as EntityType;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getPendingDuplicates(entityType, limit, offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching duplicates:", error);
    return NextResponse.json(
      { error: "Failed to fetch duplicates" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const { entityType: entityTypeParam } = await params;
    const entityType = entityTypeParam as EntityType;
    const body = await request.json();
    const { action, minSimilarity = 0.6 } = body;

    if (action === "find") {
      const pairs = await findPotentialDuplicates(entityType, minSimilarity);
      return NextResponse.json({
        success: true,
        pairsFound: pairs.length,
        pairs,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    // Extract meaningful error information
    let errorMessage = "Failed to find duplicates";
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = { stack: error.stack };
    } else if (error && typeof error === "object") {
      const errorObj = error as any;
      errorMessage = 
        errorObj?.message || 
        errorObj?.details || 
        errorObj?.hint || 
        errorObj?.code ||
        "Unknown error";
      errorDetails = {
        code: errorObj?.code,
        details: errorObj?.details,
        hint: errorObj?.hint,
        status: errorObj?.status,
      };
    }
    
    console.error("Error finding duplicates:", {
      message: errorMessage,
      entityType,
      ...errorDetails,
      errorType: error?.constructor?.name,
      errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
      fullError: error,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails.details,
        hint: errorDetails.hint,
      },
      { status: 500 }
    );
  }
}

