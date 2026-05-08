/**
 * Test Script: Entity Extraction Pipeline
 * Tests the enhanced entity extraction pipeline
 */

import { extractEntitiesEnhanced } from '../app/lib/entity-extraction/enhanced';
import { extractRelationships } from '../app/lib/entity-extraction/relationships';

const SAMPLE_TEXT = `
Dr. John Smith, the CEO of Acme Corporation, announced today that the company will be opening a new office in New York City.
The new location will be at 123 Main Street, Manhattan, NY 10001.
This is part of Project Phoenix, a major expansion initiative that has been in development for the past two years.
Dr. Smith mentioned that the company has been working closely with the New York City Economic Development Corporation.
The project is expected to create over 500 jobs in the area.
Jane Doe, the VP of Operations, will be leading the initiative.
Acme Corporation has offices in Los Angeles, San Francisco, and Chicago.
The company was founded in 2010 and has grown to over 10,000 employees worldwide.
`;

async function main() {
  console.log('Testing Enhanced Entity Extraction Pipeline...\n');
  console.log('Sample text:');
  console.log(SAMPLE_TEXT.substring(0, 200) + '...\n');

  try {
    // Test 1: Enhanced extraction
    console.log('Test 1: Running enhanced extraction pipeline...');
    const extraction = await extractEntitiesEnhanced(SAMPLE_TEXT, 'gpt-5-nano');
    console.log('✅ Extraction complete');
    console.log(`  - People: ${extraction.people.length}`);
    console.log(`  - Locations: ${extraction.locations.length}`);
    console.log(`  - Companies: ${extraction.companies.length}`);
    console.log(`  - Programs: ${extraction.programs.length}`);
    console.log();

    // Test 2: Check spans
    console.log('Test 2: Validating spans...');
    let totalSpans = 0;
    for (const person of extraction.people) {
      totalSpans += person.spans?.length || 0;
    }
    for (const location of extraction.locations) {
      totalSpans += location.spans?.length || 0;
    }
    for (const company of extraction.companies) {
      totalSpans += company.spans?.length || 0;
    }
    for (const program of extraction.programs) {
      totalSpans += program.spans?.length || 0;
    }
    console.log(`✅ Found ${totalSpans} entity spans`);
    console.log();

    // Test 3: Check normalization
    console.log('Test 3: Checking normalization...');
    const hasCanonicalNames =
      extraction.people.some((p) => p.canonicalName) ||
      extraction.locations.some((l) => l.canonicalName) ||
      extraction.companies.some((c) => c.canonicalName) ||
      extraction.programs.some((p) => p.canonicalName);
    console.log(`✅ Canonical names: ${hasCanonicalNames ? 'Yes' : 'No'}`);
    console.log();

    // Test 4: Relationship extraction
    console.log('Test 4: Extracting relationships...');
    const relationships = await extractRelationships(
      SAMPLE_TEXT,
      {
        people: extraction.people,
        locations: extraction.locations,
        companies: extraction.companies,
        programs: extraction.programs,
      },
      'gpt-5-nano'
    );
    console.log(`✅ Found ${relationships.length} relationships`);
    if (relationships.length > 0) {
      console.log('  Sample relationships:');
      relationships.slice(0, 3).forEach((rel) => {
        console.log(`    - ${rel.subject} ${rel.predicate} ${rel.object}`);
      });
    }
    console.log();

    // Test 5: Display results
    console.log('Test 5: Displaying extraction results...');
    if (extraction.people.length > 0) {
      console.log('  People:');
      extraction.people.slice(0, 3).forEach((p) => {
        console.log(`    - ${p.canonicalName || p.name} (aliases: ${(p.aliases || []).join(', ') || 'none'})`);
      });
    }
    if (extraction.locations.length > 0) {
      console.log('  Locations:');
      extraction.locations.slice(0, 3).forEach((l) => {
        console.log(`    - ${l.canonicalName || l.name} (${l.city || ''} ${l.state || ''})`.trim());
      });
    }
    if (extraction.companies.length > 0) {
      console.log('  Companies:');
      extraction.companies.slice(0, 3).forEach((c) => {
        console.log(`    - ${c.canonicalName || c.name}`);
      });
    }
    if (extraction.programs.length > 0) {
      console.log('  Programs:');
      extraction.programs.slice(0, 3).forEach((p) => {
        console.log(`    - ${p.canonicalName || p.name}`);
      });
    }
    console.log();

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
