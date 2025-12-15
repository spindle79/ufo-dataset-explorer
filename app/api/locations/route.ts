import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/locations
 * List all locations with optional search and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supabase = createAdminClient();

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      1000
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || null;
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = (searchParams.get("sortOrder") || "asc") as
      | "asc"
      | "desc";

    let query = supabase.from("locations").select("*", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,aliases.cs.{${search}},city.ilike.%${search}%,state.ilike.%${search}%,country.ilike.%${search}%`
      );
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error querying locations:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Error in Locations API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to query locations",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations
 * Create a new location
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const {
      name,
      aliases,
      latitude,
      longitude,
      address,
      city,
      state,
      country,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({
        name,
        aliases: aliases || [],
        latitude,
        longitude,
        address,
        city,
        state,
        country,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating location:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in Locations POST API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to create location",
      },
      { status: 500 }
    );
  }
}
