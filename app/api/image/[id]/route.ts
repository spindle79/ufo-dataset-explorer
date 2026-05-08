import { NextRequest, NextResponse } from "next/server";
import { getImageFileById, updateImageFile, deleteImageFile } from "@/lib/image-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const imageFile = await getImageFileById(id);

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(imageFile);
  } catch (error) {
    console.error("Error fetching image file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch image file",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, categories, fileName } = body;

    const updates: {
      description?: string;
      categories?: string[];
      fileName?: string;
    } = {};

    if (description !== undefined) updates.description = description;
    if (categories !== undefined) updates.categories = categories;
    if (fileName !== undefined) updates.fileName = fileName;

    const updated = await updateImageFile(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating image file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update image file",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteImageFile(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete image file",
      },
      { status: 500 }
    );
  }
}
