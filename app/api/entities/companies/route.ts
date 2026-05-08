/**
 * API Route: Companies CRUD operations
 * GET /api/entities/companies - List all companies (optionally filtered by source)
 * POST /api/entities/companies - Create a new company (optionally with source relationship)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { companiesEntitySchema } from "@/lib/entity-schemas";
import {
  getOrCreateCompany,
  createCompanyRelationship,
  type SourceType,
} from "@/lib/entity-relationships";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("source_type") as SourceType | null;
    const sourceId = searchParams.get("source_id");

    const supabase = createAdminClient();

    // If filtering by source, join with relationships table
    if (sourceType && sourceId) {
      const { data, error } = await supabase
        .from("companies_relationships")
        .select(
          `
          company_id,
          companies (
            id,
            name,
            aliases,
            created_at,
            updated_at
          )
        `
        )
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Extract companies from relationships
      const companies =
        data
          ?.map((rel: any) => rel.companies)
          .filter((c: any) => c !== null) || [];

      return NextResponse.json({ companies });
    }

    // Otherwise, return all companies
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ companies: data || [] });
  } catch (error) {
    console.error("Error fetching companies:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    if (
      errorMessage.includes("relation") &&
      errorMessage.includes("does not exist")
    ) {
      return NextResponse.json(
        {
          error: "Database table not found",
          message:
            "The 'companies' table does not exist. Please run the database migration: supabase/db/init/013_create_people_locations_companies_programs.sql",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch companies",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_type, source_id, ...entityData } = body;
    const validated = companiesEntitySchema.parse(entityData);

    // Get or create the company
    const companyId = await getOrCreateCompany(
      validated.name,
      validated.aliases || []
    );

    // Create relationship if source info provided
    if (source_type && source_id) {
      await createCompanyRelationship(
        companyId,
        source_type as SourceType,
        source_id
      );
    }

    // Fetch the created/updated company
    const supabase = createAdminClient();
    const { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error) {
      throw error;
    }

    // Sync to Neo4j if enabled
    if (process.env.ENABLE_NEO4J_SYNC === 'true') {
      try {
        const { syncCompanyToNeo4j } = await import('@/lib/neo4j/sync');
        await syncCompanyToNeo4j(companyId, validated.name, validated.aliases || []);

        // Sync relationship if source info provided
        if (source_type && source_id) {
          const { syncCompanyRelationshipToNeo4j } = await import('@/lib/neo4j/sync');
          await syncCompanyRelationshipToNeo4j(companyId, source_type as SourceType, source_id);
        }
      } catch (neo4jError) {
        console.error('Failed to sync company to Neo4j:', neo4jError);
        // Don't fail the request if Neo4j sync fails
      }
    }

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create company",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
