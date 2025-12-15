import { NextRequest, NextResponse } from "next/server";
import { getPdfFileById, updatePdfFile, deletePdfFile } from "@/lib/pdf-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pdfFile = await getPdfFileById(id);

    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(pdfFile);
  } catch (error) {
    console.error("Error fetching PDF file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch PDF file",
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

    const updated = await updatePdfFile(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating PDF file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update PDF file",
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
    const deleted = await deletePdfFile(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete PDF file",
      },
      { status: 500 }
    );
  }
}
