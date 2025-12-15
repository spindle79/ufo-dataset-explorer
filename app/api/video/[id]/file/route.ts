import { NextRequest, NextResponse } from "next/server";
import { getVideoFileById, getVideoFileBuffer } from "@/lib/video-access";

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

    const buffer = await getVideoFileBuffer(id);
    if (!buffer) {
      return NextResponse.json(
        { error: "Video file data not found" },
        { status: 404 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": videoFile.mimeType || "video/mp4",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `inline; filename="${videoFile.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error serving video file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to serve video file",
      },
      { status: 500 }
    );
  }
}
