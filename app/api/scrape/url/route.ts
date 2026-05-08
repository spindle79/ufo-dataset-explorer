import { NextRequest, NextResponse } from 'next/server';
import { scrapePage } from '@/lib/scrape-utils';
import { createScrapedPage } from '@/lib/scrape-access';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, description, categories } = body;

    if (!urls) {
      return NextResponse.json(
        { error: 'URLs are required' },
        { status: 400 }
      );
    }

    // Support both single URL string and array of URLs
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    // Also support newline-separated URLs
    const allUrls: string[] = [];
    for (const url of urlArray) {
      if (typeof url === 'string') {
        // Split by newlines and filter empty strings
        const splitUrls = url.split('\n')
          .map(u => u.trim())
          .filter(u => u.length > 0);
        allUrls.push(...splitUrls);
      }
    }

    if (allUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }

    // Validate URLs
    const validUrls: string[] = [];
    for (const url of allUrls) {
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        // Skip invalid URLs
        console.warn(`Invalid URL skipped: ${url}`);
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs found' },
        { status: 400 }
      );
    }

    // Scrape each URL
    const results: Array<{ url: string; success: boolean; id?: string; error?: string }> = [];
    
    for (const url of validUrls) {
      try {
        const pageContent = await scrapePage(url);
        
        // Check if scraping actually failed (error in content)
        const hasError = pageContent.markdown.includes('Error scraping page:');
        const errorMessage = hasError 
          ? pageContent.markdown.replace('Error scraping page: ', '').trim()
          : undefined;
        
        const scrapedPage = await createScrapedPage(
          {
            url,
            title: pageContent.title || url,
            description: description || '',
            categories: categories || [],
          },
          pageContent.markdown,
          pageContent.text,
          pageContent.rawHtml,
          errorMessage
        );

        // Automatic entity extraction if enabled and scraping succeeded
        // Run in background to avoid blocking the response
        if (
          process.env.ENABLE_AUTO_ENTITY_EXTRACTION === 'true' &&
          !hasError &&
          pageContent.text
        ) {
          // Run entity extraction in background (don't await)
          // This prevents blocking the API response
          (async () => {
            try {
              console.log(`[Entity Extraction] Starting extraction for scrape ${scrapedPage.id} (${pageContent.text.length} chars)`);
              
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

              console.log(`[Entity Extraction] Extracted ${entityExtractionResult.people.length} people, ${entityExtractionResult.locations.length} locations, ${entityExtractionResult.companies.length} companies, ${entityExtractionResult.programs.length} programs`);
              console.log(`[Entity Extraction] Full extraction result:`, {
                people: entityExtractionResult.people.map(p => ({ name: p.name, canonicalName: p.canonicalName, aliases: p.aliases })),
                locations: entityExtractionResult.locations.map(l => ({ name: l.name, canonicalName: l.canonicalName, aliases: l.aliases, city: l.city, state: l.state })),
                companies: entityExtractionResult.companies.map(c => ({ name: c.name, canonicalName: c.canonicalName, aliases: c.aliases })),
                programs: entityExtractionResult.programs.map(p => ({ name: p.name, canonicalName: p.canonicalName, aliases: p.aliases })),
              });

            // Save entities to Supabase and sync to Neo4j
            console.log(`[Entity Extraction] Starting to save entities to database...`);
            let savedPeople = 0;
            for (const person of entityExtractionResult.people) {
              try {
                console.log(`[Entity Extraction] Saving person: ${person.canonicalName || person.name} (aliases: ${(person.aliases || []).join(', ') || 'none'})`);
                const personId = await getOrCreatePerson(
                  person.canonicalName || person.name,
                  person.aliases || []
                );
                console.log(`[Entity Extraction] Person ID: ${personId}`);
                await createPersonRelationship(personId, 'scrape', scrapedPage.id);
                savedPeople++;
                console.log(`[Entity Extraction] Created relationship for person ${personId} to scrape ${scrapedPage.id}`);
                
                if (process.env.ENABLE_NEO4J_SYNC === 'true') {
                  await syncPersonToNeo4j(personId, person.canonicalName || person.name, person.aliases || []);
                  await syncPersonRelationshipToNeo4j(personId, 'scrape', scrapedPage.id);
                }
              } catch (err) {
                console.error(`[Entity Extraction] Failed to save person ${person.name}:`, err);
              }
            }
            console.log(`[Entity Extraction] Saved ${savedPeople} people to database`);

            let savedLocations = 0;
            for (const location of entityExtractionResult.locations) {
              try {
                console.log(`[Entity Extraction] Saving location: ${location.canonicalName || location.name} (aliases: ${(location.aliases || []).join(', ') || 'none'}, city: ${location.city || 'none'}, state: ${location.state || 'none'})`);
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
                console.log(`[Entity Extraction] Location ID: ${locationId}`);
                await createLocationRelationship(locationId, 'scrape', scrapedPage.id);
                savedLocations++;
                console.log(`[Entity Extraction] Created relationship for location ${locationId} to scrape ${scrapedPage.id}`);
                
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
                console.error(`[Entity Extraction] Failed to save location ${location.name}:`, err);
              }
            }
            console.log(`[Entity Extraction] Saved ${savedLocations} locations to database`);

            let savedCompanies = 0;
            for (const company of entityExtractionResult.companies) {
              try {
                console.log(`[Entity Extraction] Saving company: ${company.canonicalName || company.name} (aliases: ${(company.aliases || []).join(', ') || 'none'})`);
                const companyId = await getOrCreateCompany(
                  company.canonicalName || company.name,
                  company.aliases || []
                );
                console.log(`[Entity Extraction] Company ID: ${companyId}`);
                await createCompanyRelationship(companyId, 'scrape', scrapedPage.id);
                savedCompanies++;
                console.log(`[Entity Extraction] Created relationship for company ${companyId} to scrape ${scrapedPage.id}`);
                
                if (process.env.ENABLE_NEO4J_SYNC === 'true') {
                  await syncCompanyToNeo4j(companyId, company.canonicalName || company.name, company.aliases || []);
                  await syncCompanyRelationshipToNeo4j(companyId, 'scrape', scrapedPage.id);
                }
              } catch (err) {
                console.error(`[Entity Extraction] Failed to save company ${company.name}:`, err);
              }
            }
            console.log(`[Entity Extraction] Saved ${savedCompanies} companies to database`);

            let savedPrograms = 0;
            for (const program of entityExtractionResult.programs) {
              try {
                console.log(`[Entity Extraction] Saving program: ${program.canonicalName || program.name} (aliases: ${(program.aliases || []).join(', ') || 'none'})`);
                const programId = await getOrCreateProgram(
                  program.canonicalName || program.name,
                  program.aliases || [],
                  program.description
                );
                console.log(`[Entity Extraction] Program ID: ${programId}`);
                await createProgramRelationship(programId, 'scrape', scrapedPage.id);
                savedPrograms++;
                console.log(`[Entity Extraction] Created relationship for program ${programId} to scrape ${scrapedPage.id}`);
                
                if (process.env.ENABLE_NEO4J_SYNC === 'true') {
                  await syncProgramToNeo4j(programId, program.canonicalName || program.name, program.aliases || [], program.description);
                  await syncProgramRelationshipToNeo4j(programId, 'scrape', scrapedPage.id);
                }
              } catch (err) {
                console.error(`[Entity Extraction] Failed to save program ${program.name}:`, err);
              }
            }
            console.log(`[Entity Extraction] Saved ${savedPrograms} programs to database`);
            console.log(`[Entity Extraction] ✅ Completed extraction for scrape ${scrapedPage.id}: ${savedPeople} people, ${savedLocations} locations, ${savedCompanies} companies, ${savedPrograms} programs`);
            } catch (entityError) {
              console.error('[Entity Extraction] ❌ Error in automatic entity extraction:', entityError);
              console.error('[Entity Extraction] Error stack:', entityError instanceof Error ? entityError.stack : 'No stack trace');
              // Don't fail the request if entity extraction fails
            }
          })();
        }

        results.push({
          url,
          success: !hasError,
          id: scrapedPage.id,
          error: errorMessage,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if this is a database insert error (don't try to insert again)
        const isDatabaseError = errorMessage.includes('Failed to create scraped page');
        
        if (isDatabaseError) {
          // Database insert failed - don't try to insert again
          console.error(`Database insert failed for URL ${url}:`, errorMessage);
          results.push({
            url,
            success: false,
            error: errorMessage,
          });
        } else {
          // This is a scraping error - try to create an error record
          try {
            const scrapedPage = await createScrapedPage(
              {
                url,
                title: url,
                description: description || '',
                categories: categories || [],
              },
              `Error scraping page: ${errorMessage}`,
              `Error scraping page: ${errorMessage}`,
              '', // No HTML on error
              errorMessage
            );

            results.push({
              url,
              success: false,
              id: scrapedPage.id,
              error: errorMessage,
            });
          } catch (dbError) {
            // Even creating the error record failed
            console.error(`Failed to create error record for URL ${url}:`, dbError);
            results.push({
              url,
              success: false,
              error: `Scraping failed: ${errorMessage}. Database insert also failed.`,
            });
          }
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: validUrls.length,
      results,
    });
  } catch (error) {
    console.error('Error scraping URLs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape URLs' },
      { status: 500 }
    );
  }
}

