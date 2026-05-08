/**
 * API Route: Get source items for a program
 * GET /api/entities/programs/[id]/sources
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Get all relationships for this program
    const { data: relationships, error } = await supabase
      .from("programs_relationships")
      .select("source_type, source_id, created_at")
      .eq("program_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch source items based on type
    const sources = await Promise.all(
      (relationships || []).map(async (rel) => {
        if (rel.source_type === "scrape") {
          const { data } = await supabase
            .from("scraped_pages")
            .select("id, title, url, scraped_date")
            .eq("id", rel.source_id)
            .single();
          return {
            type: rel.source_type,
            id: rel.source_id,
            created_at: rel.created_at,
            item: data
              ? {
                  id: data.id,
                  title: data.title,
                  url: data.url,
                  scraped_date: data.scraped_date,
                }
              : null,
          };
        } else {
          const { data } = await supabase
            .from("original_uploads")
            .select("id, file_name, original_url, upload_date, dataset_type")
            .eq("id", rel.source_id)
            .eq("dataset_type", rel.source_type)
            .single();
          return {
            type: rel.source_type,
            id: rel.source_id,
            created_at: rel.created_at,
            item: data
              ? {
                  id: data.id,
                  fileName: data.file_name,
                  originalUrl: data.original_url,
                  uploadDate: data.upload_date,
                  datasetType: data.dataset_type,
                }
              : null,
          };
        }
      })
    );

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error fetching program sources:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch program sources",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

