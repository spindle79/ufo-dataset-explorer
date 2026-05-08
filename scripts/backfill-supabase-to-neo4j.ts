/**
 * Backfill Script: Sync Supabase to Neo4j
 * One-time script to migrate existing entities and relationships to Neo4j
 */

// Load environment variables
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createAdminClient } from '../app/lib/supabase/server';
import {
  createEntityNode,
  createDocumentNode,
  createMentionedInRelationship,
  createCoOccurrenceRelationships,
  type EntityType,
  type SourceType,
} from '../app/lib/neo4j/queries';
import { checkNeo4jHealth, shutdownNeo4j } from '../app/lib/neo4j/client';

async function main() {
  console.log('Starting backfill from Supabase to Neo4j...\n');

  // Check Neo4j health
  const neo4jHealthy = await checkNeo4jHealth();
  if (!neo4jHealthy) {
    console.error('Neo4j is not available. Please ensure Neo4j is running.');
    process.exit(1);
  }

  const supabase = createAdminClient();

  try {
    // Step 1: Backfill people
    console.log('Step 1: Backfilling people...');
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*');

    if (peopleError) {
      throw new Error(`Failed to fetch people: ${peopleError.message}`);
    }

    let peopleCount = 0;
    for (const person of people || []) {
      try {
        await createEntityNode('Person', person.id, person.name, person.aliases || []);
        peopleCount++;
      } catch (error) {
        console.error(`Failed to sync person ${person.id}:`, error);
      }
    }
    console.log(`  ✓ Backfilled ${peopleCount} people\n`);

    // Step 2: Backfill locations
    console.log('Step 2: Backfilling locations...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*');

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`);
    }

    let locationsCount = 0;
    for (const location of locations || []) {
      try {
        await createEntityNode(
          'Location',
          location.id,
          location.name,
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
        locationsCount++;
      } catch (error) {
        console.error(`Failed to sync location ${location.id}:`, error);
      }
    }
    console.log(`  ✓ Backfilled ${locationsCount} locations\n`);

    // Step 3: Backfill companies
    console.log('Step 3: Backfilling companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    let companiesCount = 0;
    for (const company of companies || []) {
      try {
        await createEntityNode('Company', company.id, company.name, company.aliases || []);
        companiesCount++;
      } catch (error) {
        console.error(`Failed to sync company ${company.id}:`, error);
      }
    }
    console.log(`  ✓ Backfilled ${companiesCount} companies\n`);

    // Step 4: Backfill programs
    console.log('Step 4: Backfilling programs...');
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*');

    if (programsError) {
      throw new Error(`Failed to fetch programs: ${programsError.message}`);
    }

    let programsCount = 0;
    for (const program of programs || []) {
      try {
        await createEntityNode(
          'Program',
          program.id,
          program.name,
          program.aliases || [],
          {
            description: program.description,
          }
        );
        programsCount++;
      } catch (error) {
        console.error(`Failed to sync program ${program.id}:`, error);
      }
    }
    console.log(`  ✓ Backfilled ${programsCount} programs\n`);

    // Step 5: Backfill documents (PDFs, audio, video)
    console.log('Step 5: Backfilling documents...');
    const { data: uploads, error: uploadsError } = await supabase
      .from('original_uploads')
      .select('*')
      .in('dataset_type', ['pdf', 'audio', 'video']);

    if (uploadsError) {
      throw new Error(`Failed to fetch uploads: ${uploadsError.message}`);
    }

    let documentsCount = 0;
    for (const upload of uploads || []) {
      try {
        await createDocumentNode(upload.id, upload.dataset_type as SourceType, {
          fileName: upload.file_name,
          originalUrl: upload.original_url,
          uploadedAt: upload.uploaded_at,
          status: upload.status,
        });
        documentsCount++;
      } catch (error) {
        console.error(`Failed to sync document ${upload.id}:`, error);
      }
    }

    // Backfill scrape pages
    const { data: scrapes, error: scrapesError } = await supabase
      .from('scraped_pages')
      .select('*');

    if (scrapesError) {
      throw new Error(`Failed to fetch scrapes: ${scrapesError.message}`);
    }

    for (const scrape of scrapes || []) {
      try {
        await createDocumentNode(scrape.id, 'scrape', {
          title: scrape.title,
          url: scrape.url,
          scrapedDate: scrape.scraped_date,
        });
        documentsCount++;
      } catch (error) {
        console.error(`Failed to sync scrape ${scrape.id}:`, error);
      }
    }
    console.log(`  ✓ Backfilled ${documentsCount} documents\n`);

    // Step 6: Backfill relationships
    console.log('Step 6: Backfilling relationships...');

    // People relationships
    const { data: peopleRels, error: peopleRelsError } = await supabase
      .from('people_relationships')
      .select('*');

    if (peopleRelsError) {
      throw new Error(`Failed to fetch people relationships: ${peopleRelsError.message}`);
    }

    let relsCount = 0;
    for (const rel of peopleRels || []) {
      try {
        await createMentionedInRelationship(
          'Person',
          rel.person_id,
          rel.source_id,
          rel.source_type as SourceType
        );
        relsCount++;
      } catch (error) {
        console.error(`Failed to sync people relationship ${rel.id}:`, error);
      }
    }

    // Locations relationships
    const { data: locationsRels, error: locationsRelsError } = await supabase
      .from('locations_relationships')
      .select('*');

    if (!locationsRelsError && locationsRels) {
      for (const rel of locationsRels) {
        try {
          await createMentionedInRelationship(
            'Location',
            rel.location_id,
            rel.source_id,
            rel.source_type as SourceType
          );
          relsCount++;
        } catch (error) {
          console.error(`Failed to sync location relationship ${rel.id}:`, error);
        }
      }
    }

    // Companies relationships
    const { data: companiesRels, error: companiesRelsError } = await supabase
      .from('companies_relationships')
      .select('*');

    if (!companiesRelsError && companiesRels) {
      for (const rel of companiesRels) {
        try {
          await createMentionedInRelationship(
            'Company',
            rel.company_id,
            rel.source_id,
            rel.source_type as SourceType
          );
          relsCount++;
        } catch (error) {
          console.error(`Failed to sync company relationship ${rel.id}:`, error);
        }
      }
    }

    // Programs relationships
    const { data: programsRels, error: programsRelsError } = await supabase
      .from('programs_relationships')
      .select('*');

    if (!programsRelsError && programsRels) {
      for (const rel of programsRels) {
        try {
          await createMentionedInRelationship(
            'Program',
            rel.program_id,
            rel.source_id,
            rel.source_type as SourceType
          );
          relsCount++;
        } catch (error) {
          console.error(`Failed to sync program relationship ${rel.id}:`, error);
        }
      }
    }
    console.log(`  ✓ Backfilled ${relsCount} relationships\n`);

    // Step 7: Create co-occurrence relationships
    console.log('Step 7: Creating co-occurrence relationships...');
    const coOccurrenceCount = await createCoOccurrenceRelationships(2);
    console.log(`  ✓ Created ${coOccurrenceCount} co-occurrence relationships\n`);

    console.log('✅ Backfill complete!');
    console.log(`\nSummary:`);
    console.log(`  - People: ${peopleCount}`);
    console.log(`  - Locations: ${locationsCount}`);
    console.log(`  - Companies: ${companiesCount}`);
    console.log(`  - Programs: ${programsCount}`);
    console.log(`  - Documents: ${documentsCount}`);
    console.log(`  - Relationships: ${relsCount}`);
    console.log(`  - Co-occurrences: ${coOccurrenceCount}`);
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await shutdownNeo4j();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
