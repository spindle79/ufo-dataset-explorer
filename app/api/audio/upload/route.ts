import { NextRequest, NextResponse } from "next/server";
import {
  createAudioFile,
  findDuplicateAudioFile,
  deleteAudioFile,
} from "@/lib/audio-access";

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
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check for duplicates if not replacing
    if (!replaceExisting) {
      const duplicate = await findDuplicateAudioFile(file.name, file.size);
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
      await deleteAudioFile(existingId);
    }

    // Parse categories
    const categories = categoriesStr
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // Create audio file record
    const audioFile = await createAudioFile(
      {
        fileName: file.name,
        originalUrl: null, // Manually uploaded
        description,
        categories,
      },
      buffer,
      file.type
    );

    return NextResponse.json(audioFile, { status: 201 });
  } catch (error) {
    console.error("Error uploading audio file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload audio file",
      },
      { status: 500 }
    );
  }
}
