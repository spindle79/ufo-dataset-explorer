import { NextRequest, NextResponse } from "next/server";
import {
  getPdfFileById,
  getPdfFileBuffer,
  updatePdfFile,
} from "@/lib/pdf-access";
import {
  getNextGenerationVersion,
  createGenerationData,
  generateGenerationType,
} from "@/lib/ai-generation-utils";
import { extractWithOpenAI } from "@/lib/pdf-extraction/openai";
import { extractWithPdfParseNew } from "@/lib/pdf-extraction/pdf-parse-new";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AiGenerationCreate } from "@/lib/supabase-types";

type ExtractionService = "openai" | "pdfparsenew";

/**
 * POST /api/pdf/[id]/extract
 * Extract text from a PDF file using OpenAI or pdf-parse
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const service: ExtractionService = body.service || "pdfparsenew";

    if (service !== "openai" && service !== "pdfparsenew") {
      return NextResponse.json(
        {
          error: 'Invalid service. Must be "openai" or "pdfparsenew"',
        },
        { status: 400 }
      );
    }

    const pdfFile = await getPdfFileById(id);
    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      );
    }

    // Get PDF file buffer
    const pdfBuffer = await getPdfFileBuffer(id);
    if (!pdfBuffer) {
      return NextResponse.json(
        { error: "Failed to load PDF file" },
        { status: 500 }
      );
    }

    // Extract text using the selected service
    let extractionResult;
    try {
      if (service === "openai") {
        extractionResult = await extractWithOpenAI(pdfBuffer);
      } else {
        extractionResult = await extractWithPdfParseNew(pdfBuffer);
      }
    } catch (error) {
      console.error(`Error extracting text with ${service}:`, error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : `Failed to extract text with ${service}`,
        },
        { status: 500 }
      );
    }

    // Get the next version number and create generation data
    const generationType = generateGenerationType("extraction", service);
    const nextVersion = await getNextGenerationVersion(
      "pdf",
      id,
      generationType
    );
    const generationData = createGenerationData(
      "pdf",
      id,
      generationType,
      nextVersion,
      extractionResult.text,
      extractionResult.metadata
    );

    // Auto-save the extraction to the database
    // Use admin client to bypass PostgREST (which is returning 404)
    // The 404 suggests PostgREST schema cache needs reload or table isn't exposed
    const supabase = createAdminClient();

    // Ensure documents field is included (required by schema)
    const fullGenerationData: AiGenerationCreate = {
      source_type: generationData.source_type,
      source_id: generationData.source_id,
      generation_type: generationData.generation_type,
      version: generationData.version,
      text_content: generationData.text_content || null,
      documents: generationData.documents || {},
      metadata: generationData.metadata || {},
    };

    // Validate required fields
    if (
      !fullGenerationData.source_type ||
      !fullGenerationData.source_id ||
      !fullGenerationData.generation_type
    ) {
      console.error(
        "Missing required fields in generation data:",
        fullGenerationData
      );
      return NextResponse.json(
        {
          error: "Invalid generation data: missing required fields",
          text: extractionResult.text,
          version: nextVersion,
          service,
          metadata: generationData.metadata,
        },
        { status: 500 }
      );
    }

    console.log("Attempting to insert generation data:", {
      source_type: fullGenerationData.source_type,
      source_id: fullGenerationData.source_id,
      generation_type: fullGenerationData.generation_type,
      version: fullGenerationData.version,
      text_length: fullGenerationData.text_content?.length || 0,
    });

    let savedGeneration;
    let saveError: any = null;

    try {
      // Try insert and check response
      const insertResult = await supabase
        .from("ai_generations")
        .insert(fullGenerationData)
        .select();

      console.log("Insert result:", {
        hasData: !!insertResult.data,
        dataLength: insertResult.data?.length || 0,
        hasError: !!insertResult.error,
        status: insertResult.status,
        statusText: insertResult.statusText,
      });

      if (insertResult.error) {
        // Log the error (same approach as generations route)
        console.error("Error saving AI generation:", insertResult.error);
        console.error("Error type:", typeof insertResult.error);
        console.error("Error keys:", Object.keys(insertResult.error));
        console.error("Error message:", (insertResult.error as any).message);
        console.error("Error details:", (insertResult.error as any).details);
        console.error("Error hint:", (insertResult.error as any).hint);
        console.error("Error code:", (insertResult.error as any).code);
        console.error(
          "Full error object:",
          JSON.stringify(insertResult.error, null, 2)
        );

        // Try to get message from various possible locations
        const errorObj = insertResult.error as any;
        const errorMsg =
          errorObj?.message ||
          errorObj?.details ||
          errorObj?.hint ||
          errorObj?.code ||
          (typeof errorObj === "string"
            ? errorObj
            : JSON.stringify(errorObj)) ||
          `Database error (status: ${insertResult.status})`;

        saveError = {
          message: errorMsg,
          details: errorObj?.details,
          hint: errorObj?.hint,
          code: errorObj?.code,
          status: insertResult.status,
          statusText: insertResult.statusText,
        };
      } else if (insertResult.data && insertResult.data.length > 0) {
        savedGeneration = insertResult.data[0];
      } else {
        // No data and no error - this is unusual
        console.error("No data returned and no error - this is unexpected");
        saveError = { message: "No data returned from insert" };
      }
    } catch (insertError: any) {
      console.error("Exception during insert:", insertError);
      console.error("Exception details:", {
        name: insertError?.name,
        message: insertError?.message,
        stack: insertError?.stack,
      });
      saveError = insertError;
    }

    if (saveError) {
      // Capture all possible error properties
      const errorDetails: any = {};

      // Try to get all enumerable properties from the error
      for (const key in saveError) {
        try {
          const value = (saveError as any)[key];
          // Only include serializable values
          if (value !== undefined && value !== null) {
            if (typeof value === "object" && !Array.isArray(value)) {
              try {
                errorDetails[key] = JSON.parse(JSON.stringify(value));
              } catch {
                errorDetails[key] = String(value);
              }
            } else {
              errorDetails[key] = value;
            }
          }
        } catch (e) {
          errorDetails[`${key}_error`] = String(e);
        }
      }

      // Also try to get own properties
      const ownProps = Object.getOwnPropertyNames(saveError);
      for (const prop of ownProps) {
        if (!errorDetails[prop]) {
          try {
            const value = (saveError as any)[prop];
            if (value !== undefined && value !== null) {
              errorDetails[prop] = value;
            }
          } catch (e) {
            // Skip if we can't access it
          }
        }
      }

      // Try to stringify the entire error
      let stringifiedError = "";
      try {
        stringifiedError = JSON.stringify(
          saveError,
          (key, value) => {
            if (value instanceof Error) {
              return {
                name: value.name,
                message: value.message,
                stack: value.stack,
              };
            }
            return value;
          },
          2
        );
      } catch (e) {
        stringifiedError = String(saveError);
      }

      // Get a meaningful error message (same approach as generations route)
      const errorMessage = saveError.message || "Unknown error";

      console.error("Error saving AI generation:");
      console.error("Full error object:", stringifiedError);
      console.error("Error details:", JSON.stringify(errorDetails, null, 2));
      console.error(
        "Generation data:",
        JSON.stringify(
          {
            source_type: fullGenerationData.source_type,
            source_id: fullGenerationData.source_id,
            generation_type: fullGenerationData.generation_type,
            version: fullGenerationData.version,
            text_length: fullGenerationData.text_content?.length || 0,
            has_metadata: !!fullGenerationData.metadata,
            has_documents: !!fullGenerationData.documents,
          },
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error: `Extraction completed but failed to save: ${errorMessage}`,
          text: extractionResult.text,
          version: nextVersion,
          service,
          metadata: generationData.metadata,
        },
        { status: 500 }
      );
    }

    if (!savedGeneration) {
      console.error(
        "Error: Generation was not saved but no error was returned"
      );
      return NextResponse.json(
        {
          error:
            "Extraction completed but failed to save (no generation returned)",
          text: extractionResult.text,
          version: nextVersion,
          service,
          metadata: generationData.metadata,
        },
        { status: 500 }
      );
    }

    // Optionally set as current extraction (default: true)
    const setAsCurrent = body.setAsCurrent !== false;
    if (setAsCurrent && savedGeneration) {
      try {
        await updatePdfFile(id, {
          currentExtractionId: savedGeneration.id,
        });
      } catch (updateError) {
        console.error("Error setting current extraction:", updateError);
        // Don't fail the request if setting current fails
      }
    }

    // Automatic entity extraction if enabled
    let entityExtractionResult: any = null;
    if (
      process.env.ENABLE_AUTO_ENTITY_EXTRACTION === 'true' &&
      extractionResult.text
    ) {
      try {
        const { extractEntitiesWithNeo4j } = await import(
          '@/lib/entity-extraction/neo4j-enhanced'
        );
        const { getOrCreatePerson, getOrCreateLocation, getOrCreateCompany, getOrCreateProgram } = await import(
          '@/lib/entity-relationships'
        );
        const {
          createPersonRelationship,
          createLocationRelationship,
          createCompanyRelationship,
          createProgramRelationship,
        } = await import('@/lib/entity-relationships');

        entityExtractionResult = await extractEntitiesWithNeo4j(
          extractionResult.text,
          id,
          'pdf'
        );

        // Save entities to Supabase and sync to Neo4j
        const { syncPersonToNeo4j, syncLocationToNeo4j, syncCompanyToNeo4j, syncProgramToNeo4j } = await import('@/lib/neo4j/sync');
        const { syncPersonRelationshipToNeo4j, syncLocationRelationshipToNeo4j, syncCompanyRelationshipToNeo4j, syncProgramRelationshipToNeo4j } = await import('@/lib/neo4j/sync');

        // Save people
        for (const person of entityExtractionResult.people) {
          try {
            const personId = await getOrCreatePerson(
              person.canonicalName || person.name,
              person.aliases || []
            );
            await createPersonRelationship(personId, 'pdf', id);
            
            // Sync to Neo4j
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncPersonToNeo4j(personId, person.canonicalName || person.name, person.aliases || []);
              await syncPersonRelationshipToNeo4j(personId, 'pdf', id);
            }
          } catch (err) {
            console.warn(`Failed to save person ${person.name}:`, err);
          }
        }

        // Save locations
        for (const location of entityExtractionResult.locations) {
          try {
            const locationId = await getOrCreateLocation(
              location.canonicalName || location.name,
              location.aliases || [],
              {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country,
              }
            );
            await createLocationRelationship(locationId, 'pdf', id);
            
            // Sync to Neo4j
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncLocationToNeo4j(
                locationId,
                location.canonicalName || location.name,
                location.aliases || [],
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  address: location.address,
                  city: location.city,
                  state: location.state,
                  country: location.country,
                }
              );
              await syncLocationRelationshipToNeo4j(locationId, 'pdf', id);
            }
          } catch (err) {
            console.warn(`Failed to save location ${location.name}:`, err);
          }
        }

        // Save companies
        for (const company of entityExtractionResult.companies) {
          try {
            const companyId = await getOrCreateCompany(
              company.canonicalName || company.name,
              company.aliases || []
            );
            await createCompanyRelationship(companyId, 'pdf', id);
            
            // Sync to Neo4j
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncCompanyToNeo4j(companyId, company.canonicalName || company.name, company.aliases || []);
              await syncCompanyRelationshipToNeo4j(companyId, 'pdf', id);
            }
          } catch (err) {
            console.warn(`Failed to save company ${company.name}:`, err);
          }
        }

        // Save programs
        for (const program of entityExtractionResult.programs) {
          try {
            const programId = await getOrCreateProgram(
              program.canonicalName || program.name,
              program.aliases || [],
              program.description
            );
            await createProgramRelationship(programId, 'pdf', id);
            
            // Sync to Neo4j
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncProgramToNeo4j(programId, program.canonicalName || program.name, program.aliases || [], program.description);
              await syncProgramRelationshipToNeo4j(programId, 'pdf', id);
            }
          } catch (err) {
            console.warn(`Failed to save program ${program.name}:`, err);
          }
        }
      } catch (entityError) {
        console.error('Error in automatic entity extraction:', entityError);
        // Don't fail the request if entity extraction fails
      }
    }

    // Return the extracted text and saved generation info
    return NextResponse.json({
      text: extractionResult.text,
      version: nextVersion,
      service,
      metadata: generationData.metadata,
      generationId: savedGeneration.id,
      saved: true,
      isCurrent: setAsCurrent,
      entities: entityExtractionResult
        ? {
            people: entityExtractionResult.people.length,
            locations: entityExtractionResult.locations.length,
            companies: entityExtractionResult.companies.length,
            programs: entityExtractionResult.programs.length,
            relationships: entityExtractionResult.relationships?.length || 0,
          }
        : null,
    });
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract PDF text",
      },
      { status: 500 }
    );
  }
}
