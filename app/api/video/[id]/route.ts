import { NextRequest, NextResponse } from "next/server";
import { getVideoFileById, updateVideoFile } from "@/lib/video-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoFile = await getVideoFileById(id);

    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(videoFile);
  } catch (error) {
    console.error("Error fetching video file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch video file",
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

    const updated = await updateVideoFile(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating video file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update video file",
      },
      { status: 500 }
    );
  }
}
