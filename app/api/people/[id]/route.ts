import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/people/[id]
 * Get a single person by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Person not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching person:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in People GET API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to fetch person",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/people/[id]
 * Update a person
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { name, aliases } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (aliases !== undefined) updateData.aliases = aliases;

    const { data, error } = await supabase
      .from("people")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Person not found" },
          { status: 404 }
        );
      }
      console.error("Error updating person:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in People PUT API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to update person",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/people/[id]
 * Delete a person
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting person:", error);
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in People DELETE API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Failed to delete person",
      },
      { status: 500 }
    );
  }
}
