/**
 * API Route: Get graph statistics
 * GET /api/graph/stats
 */

import { NextRequest, NextResponse } from "next/server";
import { getGraphStats } from "@/lib/neo4j/queries";

export async function GET(request: NextRequest) {
  try {
    const stats = await getGraphStats();

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    console.error("Error fetching graph stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch graph statistics",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
