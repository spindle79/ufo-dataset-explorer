import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { processHtmlSnippet } from "@/lib/scrape-utils";
import { createScrapedPage } from "@/lib/scrape-access";

export async function POST(request: NextRequest) {
  try {
    // Get the request body as text first to check size
    const bodyText = await request.text();

    // Check body size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (bodyText.length > maxSize) {
      return NextResponse.json(
        {
          error: "Request body too large",
          message: `HTML snippet exceeds maximum size of ${
            maxSize / 1024 / 1024
          }MB. Please reduce the size of your HTML snippet.`,
          maxSize: `${maxSize / 1024 / 1024}MB`,
          receivedSize: `${(bodyText.length / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 413 }
      );
    }

    // Parse JSON
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { html, sourceUrl, title, description, categories } = body;

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    if (typeof html !== "string" || html.trim().length === 0) {
      return NextResponse.json(
        { error: "HTML content must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate sourceUrl if provided
    if (sourceUrl) {
      try {
        new URL(sourceUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid source URL format" },
          { status: 400 }
        );
      }
    }

    try {
      // Process the HTML snippet with optional source URL
      const pageContent = processHtmlSnippet(html, title, sourceUrl);

      // Check if processing actually failed (error in content)
      const hasError = pageContent.markdown.includes("Error processing HTML:");
      const errorMessage = hasError
        ? pageContent.markdown.replace("Error processing HTML: ", "").trim()
        : undefined;

      // Use source URL if provided, otherwise create a short hash-based identifier
      // This avoids PostgreSQL index size limits (8KB max) for large HTML snippets
      let url: string;
      if (sourceUrl) {
        url = sourceUrl;
      } else {
        // Create a short hash of the HTML content for uniqueness
        // This keeps the URL under the 8KB index limit while still being unique
        const hash = createHash("sha256")
          .update(html)
          .digest("hex")
          .substring(0, 16); // Use first 16 chars of hash (32 bytes total, but we only need uniqueness)
        url = `html-snippet:${hash}`;
      }

      const scrapedPage = await createScrapedPage(
        {
          url,
          title: pageContent.title || title || "HTML Snippet",
          description: description || "",
          categories: categories || [],
        },
        pageContent.markdown,
        pageContent.text,
        pageContent.rawHtml,
        errorMessage
      );

      // Automatic entity extraction if enabled and processing succeeded
      if (
        process.env.ENABLE_AUTO_ENTITY_EXTRACTION === 'true' &&
        !hasError &&
        pageContent.text
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
          const { syncPersonToNeo4j, syncLocationToNeo4j, syncCompanyToNeo4j, syncProgramToNeo4j } = await import('@/lib/neo4j/sync');
          const { syncPersonRelationshipToNeo4j, syncLocationRelationshipToNeo4j, syncCompanyRelationshipToNeo4j, syncProgramRelationshipToNeo4j } = await import('@/lib/neo4j/sync');

          const entityExtractionResult = await extractEntitiesWithNeo4j(
            pageContent.text,
            scrapedPage.id,
            'scrape'
          );

          // Save entities to Supabase and sync to Neo4j
          for (const person of entityExtractionResult.people) {
            try {
              const personId = await getOrCreatePerson(
                person.canonicalName || person.name,
                person.aliases || []
              );
              await createPersonRelationship(personId, 'scrape', scrapedPage.id);
              
              if (process.env.ENABLE_NEO4J_SYNC === 'true') {
                await syncPersonToNeo4j(personId, person.canonicalName || person.name, person.aliases || []);
                await syncPersonRelationshipToNeo4j(personId, 'scrape', scrapedPage.id);
              }
            } catch (err) {
              console.warn(`Failed to save person ${person.name}:`, err);
            }
          }

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
              await createLocationRelationship(locationId, 'scrape', scrapedPage.id);
              
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
                await syncLocationRelationshipToNeo4j(locationId, 'scrape', scrapedPage.id);
              }
            } catch (err) {
              console.warn(`Failed to save location ${location.name}:`, err);
            }
          }

          for (const company of entityExtractionResult.companies) {
            try {
              const companyId = await getOrCreateCompany(
                company.canonicalName || company.name,
                company.aliases || []
              );
              await createCompanyRelationship(companyId, 'scrape', scrapedPage.id);
              
              if (process.env.ENABLE_NEO4J_SYNC === 'true') {
                await syncCompanyToNeo4j(companyId, company.canonicalName || company.name, company.aliases || []);
                await syncCompanyRelationshipToNeo4j(companyId, 'scrape', scrapedPage.id);
              }
            } catch (err) {
              console.warn(`Failed to save company ${company.name}:`, err);
            }
          }

          for (const program of entityExtractionResult.programs) {
            try {
              const programId = await getOrCreateProgram(
                program.canonicalName || program.name,
                program.aliases || [],
                program.description
              );
              await createProgramRelationship(programId, 'scrape', scrapedPage.id);
              
              if (process.env.ENABLE_NEO4J_SYNC === 'true') {
                await syncProgramToNeo4j(programId, program.canonicalName || program.name, program.aliases || [], program.description);
                await syncProgramRelationshipToNeo4j(programId, 'scrape', scrapedPage.id);
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

      return NextResponse.json({
        success: !hasError,
        id: scrapedPage.id,
        error: errorMessage,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check if this is a database insert error (don't try to insert again)
      const isDatabaseError = errorMessage.includes(
        "Failed to create scraped page"
      );

      if (isDatabaseError) {
        // Database insert failed - don't try to insert again
        console.error(`Database insert failed for HTML snippet:`, errorMessage);
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
          },
          { status: 500 }
        );
      } else {
        // This is a processing error - try to create an error record
        try {
          // Use source URL if provided, otherwise create a short hash-based identifier
          let url: string;
          if (sourceUrl) {
            url = sourceUrl;
          } else {
            const hash = createHash("sha256")
              .update(html)
              .digest("hex")
              .substring(0, 16);
            url = `html-snippet:${hash}`;
          }
          const scrapedPage = await createScrapedPage(
            {
              url,
              title: title || "HTML Snippet",
              description: description || "",
              categories: categories || [],
            },
            `Error processing HTML: ${errorMessage}`,
            `Error processing HTML: ${errorMessage}`,
            "", // No HTML on error
            errorMessage
          );

          return NextResponse.json({
            success: false,
            id: scrapedPage.id,
            error: errorMessage,
          });
        } catch (dbError) {
          // Even creating the error record failed
          console.error(
            `Failed to create error record for HTML snippet:`,
            dbError
          );
          return NextResponse.json(
            {
              success: false,
              error: `Processing failed: ${errorMessage}. Database insert also failed.`,
            },
            { status: 500 }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error processing HTML snippet:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process HTML snippet",
      },
      { status: 500 }
    );
  }
}
