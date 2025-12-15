import { NextRequest, NextResponse } from "next/server";
import { getPdfFileById, updatePdfFile } from "@/lib/pdf-access";
import { createAdminClient } from "@/lib/supabase/server";
import { uploadFileForDataset, STORAGE_BUCKETS } from "@/lib/supabase-storage";

/**
 * POST /api/pdf/[id]/process
 * Process a discovered or pending PDF file
 * - For "discovered" files: Fetches the file from the URL and uploads it
 * - For "pending" files: Marks as ready for processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({})); // Optional body
    const { url: providedUrl } = body;

    // Get the PDF file
    const pdfFile = await getPdfFileById(id);
    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Get the full record to check status and original_url
    const { data: record, error: recordError } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("id", id)
      .eq("dataset_type", "pdf")
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "PDF file record not found" },
        { status: 404 }
      );
    }

    // If status is "discovered" or "pending" with placeholder file_path, fetch the file from URL
    // Use provided URL if given, otherwise use stored original_url
    const urlToFetch = providedUrl || record.original_url;
    const hasPlaceholderPath =
      record.file_path && record.file_path.startsWith("discovered/");
    // If a URL is explicitly provided, always try to fetch (user wants to update/fetch the file)
    // Otherwise, only fetch if status is "discovered" or has placeholder path
    const needsFetch =
      urlToFetch &&
      (providedUrl || // URL explicitly provided - always fetch
        record.status === "discovered" ||
        (record.status === "pending" && hasPlaceholderPath));
    if (needsFetch) {
      try {
        // Update original_url and canonical_url if a new URL was provided
        if (providedUrl && providedUrl !== record.original_url) {
          const { getCanonicalUrl } = await import("@/lib/url-utils");
          const { error: updateError } = await supabase
            .from("original_uploads")
            .update({
              original_url: providedUrl,
              canonical_url: getCanonicalUrl(providedUrl),
            })
            .eq("id", id);

          if (updateError) {
            return NextResponse.json(
              { error: `Failed to update URL: ${updateError.message}` },
              { status: 500 }
            );
          }
        }

        // Fetch the PDF file
        const response = await fetch(urlToFetch);
        if (!response.ok) {
          return NextResponse.json(
            {
              error: `Failed to fetch PDF from URL: ${response.statusText}`,
            },
            { status: 400 }
          );
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("pdf")) {
          return NextResponse.json(
            { error: "URL does not point to a PDF file" },
            { status: 400 }
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Extract filename from URL or use existing
        // Decode URL-encoded characters (e.g., %20 -> space)
        const urlPath = new URL(urlToFetch).pathname;
        let fileName =
          decodeURIComponent(urlPath.split("/").pop() || "") ||
          record.file_name ||
          "document.pdf";

        // Try to extract filename from Content-Disposition header if available
        const contentDisposition = response.headers.get("content-disposition");
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          );
          if (filenameMatch && filenameMatch[1]) {
            fileName = filenameMatch[1].replace(/['"]/g, "");
          }
        }

        // Get the expected storage path (before uploading)
        const { generateStoragePath } = await import("@/lib/supabase-storage");
        const expectedPath = generateStoragePath("pdf", id, fileName);

        // Delete old file if it exists (will be replaced by new upload)
        // Also delete the expected path in case a file already exists there
        const pathsToDelete = new Set<string>();
        if (record.file_path && !record.file_path.startsWith("discovered/")) {
          pathsToDelete.add(record.file_path);
        }
        if (expectedPath !== record.file_path) {
          pathsToDelete.add(expectedPath);
        }

        // Delete all potential conflicting files
        const { deleteFile } = await import("@/lib/supabase-storage");
        for (const pathToDelete of pathsToDelete) {
          try {
            await deleteFile(STORAGE_BUCKETS.PDF_FILES, pathToDelete, true);
          } catch (deleteError) {
            // Log but continue - file might not exist
            console.warn(`Failed to delete file ${pathToDelete}:`, deleteError);
          }
        }

        // Upload file to Supabase Storage (now that conflicting files are deleted)
        const uploadResult = await uploadFileForDataset(
          "pdf",
          id,
          fileName,
          fileBuffer,
          {
            contentType: contentType,
            upsert: true, // Extra safety - allow overwriting if something still exists
            useAdmin: true,
          }
        );

        // Update the record with actual file info and change status to "pending"
        const { error: updateError, data: updatedRecord } = await supabase
          .from("original_uploads")
          .update({
            file_path: uploadResult.path, // Use the actual path returned from upload
            file_name: fileName,
            file_size: fileBuffer.length,
            mime_type: contentType,
            status: "pending", // Now ready for processing
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) {
          console.error("Failed to update PDF record:", updateError);
          // Try to delete the uploaded file since DB update failed
          try {
            const { deleteFile } = await import("@/lib/supabase-storage");
            await deleteFile(
              STORAGE_BUCKETS.PDF_FILES,
              uploadResult.path,
              true
            );
          } catch (deleteError) {
            console.error("Failed to cleanup uploaded file:", deleteError);
          }
          return NextResponse.json(
            { error: `Failed to update record: ${updateError.message}` },
            { status: 500 }
          );
        }

        // Verify the file exists in storage
        try {
          const { downloadFile } = await import("@/lib/supabase-storage");
          const testBlob = await downloadFile(
            STORAGE_BUCKETS.PDF_FILES,
            uploadResult.path,
            true
          );
          if (!testBlob || testBlob.size === 0) {
            throw new Error("Uploaded file is empty or not accessible");
          }
        } catch (verifyError) {
          console.error("File verification failed:", verifyError);
          return NextResponse.json(
            {
              error: `File uploaded but verification failed: ${
                verifyError instanceof Error
                  ? verifyError.message
                  : "Unknown error"
              }`,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: "File fetched and uploaded successfully",
          status: "pending",
          filePath: uploadResult.path,
          fileSize: fileBuffer.length,
        });
      } catch (fetchError) {
        return NextResponse.json(
          {
            error:
              fetchError instanceof Error
                ? fetchError.message
                : "Failed to fetch PDF file",
          },
          { status: 500 }
        );
      }
    }

    // If status is "pending" and file already exists, just confirm it's ready
    if (record.status === "pending" && record.file_path) {
      return NextResponse.json({
        message: "File is ready for processing",
        status: "pending",
      });
    }

    return NextResponse.json(
      {
        error: `File with status "${record.status}" cannot be processed this way`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing PDF file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process PDF file",
      },
      { status: 500 }
    );
  }
}
