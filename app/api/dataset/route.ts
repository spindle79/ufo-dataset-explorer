import { NextRequest, NextResponse } from "next/server";
import { queryDataset, DatasetQuery } from "@/lib/dataset";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const query: DatasetQuery = {
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : undefined,
      state: searchParams.get("state") || undefined,
      country: searchParams.get("country") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      latMin: searchParams.get("latMin")
        ? parseFloat(searchParams.get("latMin")!)
        : undefined,
      latMax: searchParams.get("latMax")
        ? parseFloat(searchParams.get("latMax")!)
        : undefined,
      lonMin: searchParams.get("lonMin")
        ? parseFloat(searchParams.get("lonMin")!)
        : undefined,
      lonMax: searchParams.get("lonMax")
        ? parseFloat(searchParams.get("lonMax")!)
        : undefined,
      clusterId: searchParams.get("clusterId")
        ? parseInt(searchParams.get("clusterId")!)
        : undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
      search: searchParams.get("search") || undefined,
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
    console.error("Error querying dataset:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to query dataset",
      },
      { status: 500 }
    );
  }
}
