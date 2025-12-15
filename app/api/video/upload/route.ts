import { NextRequest, NextResponse } from "next/server";
import {
  createVideoFile,
  findDuplicateVideoFile,
  deleteVideoFile,
} from "@/lib/video-access";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = (formData.get("description") as string) || "";
    const categoriesStr = (formData.get("categories") as string) || "";
    const replaceExisting = formData.get("replaceExisting") === "true";
    const existingId = formData.get("existingId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video file" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check for duplicates if not replacing
    if (!replaceExisting) {
      const duplicate = await findDuplicateVideoFile(file.name, file.size);
      if (duplicate) {
        return NextResponse.json(
          {
            error: "DUPLICATE_FILE",
            duplicate: {
              id: duplicate.id,
              fileName: duplicate.fileName,
              fileSize: duplicate.fileSize,
              uploadedDate: duplicate.uploadedDate,
              description: duplicate.description,
            },
          },
          { status: 409 }
        );
      }
    } else if (existingId) {
      // Delete existing file if replacing
      await deleteVideoFile(existingId);
    }

    // Parse categories
    const categories = categoriesStr
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // Create video file record
    const videoFile = await createVideoFile(
      {
        fileName: file.name,
        originalUrl: null, // Manually uploaded
        description,
        categories,
      },
      buffer,
      file.type
    );

    return NextResponse.json(videoFile, { status: 201 });
  } catch (error) {
    console.error("Error uploading video file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload video file",
      },
      { status: 500 }
    );
  }
}
