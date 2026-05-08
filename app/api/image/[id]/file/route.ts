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

    // Check if file is discovered but not yet processed
    const isPlaceholderPath =
      imageFile.filePath && imageFile.filePath.startsWith("discovered/");
    const isDiscoveredStatus = imageFile.status === "discovered";

    if (isPlaceholderPath || isDiscoveredStatus) {
      return NextResponse.json(
        {
          error: "Image file has been discovered but not yet processed. Please process the file first.",
          status: imageFile.status,
          needsProcessing: true,
        },
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

    return new NextResponse(buffer as any, {
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
