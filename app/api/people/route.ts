import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/people
 * List all people with optional search and pagination
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

    let query = supabase.from("people").select("*", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,aliases.cs.{${search}}`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error querying people:", error);
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
    console.error("Error in People API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to query people",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/people
 * Create a new person
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { name, aliases } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("people")
      .insert({
        name,
        aliases: aliases || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating person:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in People POST API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to create person",
      },
      { status: 500 }
    );
  }
}
