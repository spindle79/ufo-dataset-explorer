import { NextRequest, NextResponse } from "next/server";
import { getAllImageFiles } from "@/lib/image-access";

export async function GET(request: NextRequest) {
  try {
    const imageFiles = await getAllImageFiles();
    return NextResponse.json(imageFiles);
  } catch (error) {
    console.error("Error fetching image files:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch image files",
      },
      { status: 500 }
    );
  }
}
