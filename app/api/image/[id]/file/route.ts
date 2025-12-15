import { NextRequest, NextResponse } from "next/server";
import { getImageFileById, getImageFileBuffer } from "@/lib/image-access";

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

    const buffer = await getImageFileBuffer(id);
    if (!buffer) {
      return NextResponse.json(
        { error: "Image file data not found" },
        { status: 404 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": imageFile.mimeType || "image/jpeg",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `inline; filename="${imageFile.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error serving image file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to serve image file",
      },
      { status: 500 }
    );
  }
}
