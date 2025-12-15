import { NextRequest, NextResponse } from "next/server";
import {
  createPdfFile,
  createPdfFileFromUrl,
  findDuplicatePdfFileByUrl,
  deletePdfFile,
} from "@/lib/pdf-access";
import { getCanonicalUrl } from "@/lib/url-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      description,
      categories,
      replaceExisting,
      existingId,
      skipDownload,
    } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check for duplicates if not replacing
    if (!replaceExisting) {
      const canonicalUrl = getCanonicalUrl(url);
      console.log(
        `[PDF URL Upload] Checking for duplicates - canonicalUrl: ${canonicalUrl}, originalUrl: ${url}`
      );
      const duplicate = await findDuplicatePdfFileByUrl(canonicalUrl, url);
      if (duplicate) {
        console.log(
          `[PDF URL Upload] Duplicate found: ${duplicate.id} - ${duplicate.fileName}`
        );
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
      console.log(
        `[PDF URL Upload] No duplicate found, proceeding with upload`
      );
    } else if (existingId) {
      // Delete existing file if replacing
      await deletePdfFile(existingId);
    }

    // Extract filename from URL
    let fileName: string = url.split("/").pop() || "pdf_file";

    // If skipDownload is true, create record without downloading
    if (skipDownload === true) {
      const pdfFile = await createPdfFileFromUrl({
        fileName,
        originalUrl: url,
        description: description || "",
        categories: categories || [],
      });

      return NextResponse.json(pdfFile, { status: 201 });
    }

    // Otherwise, download the file (existing behavior)
    let fileBuffer: Buffer | null = null;
    let mimeType: string | undefined;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF from URL: ${response.statusText}` },
          { status: 400 }
        );
      }

      const contentType = response.headers.get("content-type");
      if (
        contentType &&
        (contentType === "application/pdf" ||
          url.toLowerCase().endsWith(".pdf"))
      ) {
        mimeType = contentType || "application/pdf";
        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);

        // Try to extract filename from Content-Disposition header
        const contentDisposition = response.headers.get("content-disposition");
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          );
          if (filenameMatch && filenameMatch[1]) {
            fileName = filenameMatch[1].replace(/['"]/g, "");
          }
        }
      } else {
        return NextResponse.json(
          { error: "URL does not point to a PDF file" },
          { status: 400 }
        );
      }
    } catch (fetchError) {
      return NextResponse.json(
        {
          error: `Failed to fetch PDF from URL: ${
            fetchError instanceof Error ? fetchError.message : "Unknown error"
          }`,
        },
        { status: 400 }
      );
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { error: "Failed to download PDF file" },
        { status: 400 }
      );
    }

    // Create PDF file record
    const pdfFile = await createPdfFile(
      {
        fileName,
        originalUrl: url,
        description: description || "",
        categories: categories || [],
      },
      fileBuffer,
      mimeType
    );

    return NextResponse.json(pdfFile, { status: 201 });
  } catch (error) {
    console.error("Error adding PDF from URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add PDF from URL",
      },
      { status: 500 }
    );
  }
}
