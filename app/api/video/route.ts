import { NextRequest, NextResponse } from "next/server";
import { getAllVideoFiles } from "@/lib/video-access";

export async function GET(request: NextRequest) {
  try {
    const videoFiles = await getAllVideoFiles();
    return NextResponse.json(videoFiles);
  } catch (error) {
    console.error("Error fetching video files:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch video files",
      },
      { status: 500 }
    );
  }
}
