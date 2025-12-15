import { NextRequest, NextResponse } from "next/server";
import { getVideoFileById, updateVideoFile } from "@/lib/video-access";
import { createAdminClient } from "@/lib/supabase/server";
import { uploadFileForDataset, STORAGE_BUCKETS } from "@/lib/supabase-storage";

/**
 * POST /api/video/[id]/process
 * Process a discovered or pending video file
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

    // Get the video file
    const videoFile = await getVideoFileById(id);
    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Get the full record to check status and original_url
    const { data: record, error: recordError } = await supabase
      .from("original_uploads")
      .select("*")
      .eq("id", id)
      .eq("dataset_type", "video")
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "Video file record not found" },
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

        // Fetch the video file
        const response = await fetch(urlToFetch);
        if (!response.ok) {
          return NextResponse.json(
            {
              error: `Failed to fetch video from URL: ${response.statusText}`,
            },
            { status: 400 }
          );
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith("video/")) {
          return NextResponse.json(
            { error: "URL does not point to a video file" },
            { status: 400 }
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Extract filename from URL or use existing
        const urlPath = new URL(urlToFetch).pathname;
        const fileName =
          urlPath.split("/").pop() || record.file_name || "video_file";

        // Upload file to Supabase Storage
        const storagePath = `video/${id}/${fileName}`;
        await uploadFileForDataset("video", id, fileName, fileBuffer, {
          contentType: contentType,
          useAdmin: true,
        });

        // Update the record with actual file info and change status to "pending"
        const { error: updateError } = await supabase
          .from("original_uploads")
          .update({
            file_path: storagePath,
            file_name: fileName,
            file_size: fileBuffer.length,
            mime_type: contentType,
            status: "pending", // Now ready for processing
          })
          .eq("id", id);

        if (updateError) {
          return NextResponse.json(
            { error: `Failed to update record: ${updateError.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: "File fetched and uploaded successfully",
          status: "pending",
        });
      } catch (fetchError) {
        return NextResponse.json(
          {
            error:
              fetchError instanceof Error
                ? fetchError.message
                : "Failed to fetch video file",
          },
          { status: 500 }
        );
      }
    }

    // If status is "pending" (manually uploaded), just confirm it's ready
    if (record.status === "pending") {
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
    console.error("Error processing video file:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process video file",
      },
      { status: 500 }
    );
  }
}
