import { NextRequest, NextResponse } from 'next/server';
import { scrapePage } from '@/lib/scrape-utils';
import { createScrapedPage } from '@/lib/scrape-access';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No CSV file provided' },
        { status: 400 }
      );
    }

    // Read CSV file
    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or has no valid rows' },
        { status: 400 }
      );
    }

    // Find URL column (try common column names)
    const urlColumn = Object.keys(records[0]).find(
      key => 
        key.toLowerCase() === 'url' ||
        key.toLowerCase() === 'link' ||
        key.toLowerCase() === 'website' ||
        key.toLowerCase() === 'page_url'
    );

    if (!urlColumn) {
      return NextResponse.json(
        { error: 'CSV file must contain a column named "url", "link", "website", or "page_url"' },
        { status: 400 }
      );
    }

    // Process each URL
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      const url = record[urlColumn];
      if (!url || typeof url !== 'string') {
        failedCount++;
        continue;
      }

      try {
        // Validate URL
        new URL(url);

        // Scrape the page
        const pageContent = await scrapePage(url);

        // Extract description and categories from CSV if available
        const description = record.description || record.desc || '';
        const categoriesStr = record.categories || record.category || '';
        const categories = categoriesStr
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        // Check if scraping actually failed
        const hasError = pageContent.markdown.includes('Error scraping page:');
        const errorMessage = hasError 
          ? pageContent.markdown.replace('Error scraping page: ', '').trim()
          : undefined;

        const scrapedPage = await createScrapedPage(
          {
            url,
            title: pageContent.title || url,
            description,
            categories,
          },
          pageContent.markdown,
          pageContent.text,
          pageContent.rawHtml,
          errorMessage
        );

        // Automatic entity extraction if enabled and scraping succeeded
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

        if (hasError) {
          failedCount++;
          errors.push(`Error scraping ${url}: ${errorMessage}`);
        } else {
          successCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedCount++;
        errors.push(`Error processing ${url}: ${errorMessage}`);
        
        // Create a record with the error
        try {
          const description = record.description || record.desc || '';
          const categoriesStr = record.categories || record.category || '';
          const categories = categoriesStr
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

          await createScrapedPage(
            {
              url,
              title: url,
              description,
              categories,
            },
            `Error scraping page: ${errorMessage}`,
            `Error scraping page: ${errorMessage}`,
            '', // No HTML on error
            errorMessage
          );
        } catch (createError) {
          // If we can't even create the error record, just log it
          console.error(`Failed to create error record for ${url}:`, createError);
        }
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: records.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}

