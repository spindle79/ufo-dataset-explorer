import { NextRequest, NextResponse } from "next/server";
import { queryDataset, DatasetQuery } from "@/lib/dataset";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse request body
    const query: DatasetQuery = {
      limit: body.limit,
      offset: body.offset,
      state: body.filters?.state,
      country: body.filters?.country,
      dateFrom: body.filters?.dateFrom,
      dateTo: body.filters?.dateTo,
      latMin: body.filters?.latMin,
      latMax: body.filters?.latMax,
      lonMin: body.filters?.lonMin,
      lonMax: body.filters?.lonMax,
      clusterId: body.filters?.clusterId,
      sortBy: body.sortBy,
      sortOrder: body.sortOrder,
      search: body.query,
    };

    // Validate limit
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 1000)) {
      return NextResponse.json(
        {
          error: "Invalid parameter",
          message: "limit must be between 1 and 1000",
        },
        { status: 400 }
      );
    }

    const result = await queryDataset(query);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching dataset:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to search dataset",
      },
      { status: 500 }
    );
  }
}
