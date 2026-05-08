/**
 * Neo4j-Enhanced Entity Extraction
 * Uses graph context to improve extraction accuracy
 */

import { extractEntitiesEnhanced } from './enhanced';
import { extractRelationships } from './relationships';
import { findSimilarEntities } from '../neo4j/queries';
import { checkNeo4jHealth } from '../neo4j/client';
import { getDefaultModel, getLLMConfig } from '../llm/config';
import type { EntityExtractionResponse } from '../entity-schemas';
import type { SourceType } from '../entity-relationships';

/**
 * Extract entities with Neo4j graph context
 */
export async function extractEntitiesWithNeo4j(
  content: string,
  sourceId: string,
  sourceType: SourceType,
  model?: string
): Promise<EntityExtractionResponse & {
  graphContext?: {
    similarEntities: number;
    suggestedRelationships: number;
  };
}> {
  const config = getLLMConfig();
  const defaultModel = model || getDefaultModel(config.provider);
  
  // Step 1: Run enhanced extraction pipeline
  const initialExtraction = await extractEntitiesEnhanced(content, defaultModel);

  // Step 2: Check if Neo4j is available
  const neo4jAvailable = await checkNeo4jHealth();

  if (!neo4jAvailable) {
    // Neo4j not available - just do basic extraction
    // Neo4j sync will happen when entities are saved to Supabase (if enabled)
    return initialExtraction;
  }

  // Step 3: Get graph context for similar entities
  const allEntityNames = [
    ...initialExtraction.people.map((p) => p.name),
    ...initialExtraction.locations.map((l) => l.name),
    ...initialExtraction.companies.map((c) => c.name),
    ...initialExtraction.programs.map((p) => p.name),
  ];

  const similarEntities: Array<{ name: string; type: string }> = [];
  for (const name of allEntityNames) {
    try {
      const similar = await findSimilarEntities(name, ['Person', 'Location', 'Company', 'Program'], 5); // limit is already an integer
      similarEntities.push(...similar.map((s) => ({ name: s.name, type: s.type })));
    } catch (error) {
      console.warn(`Failed to find similar entities for ${name}:`, error);
    }
  }

  // Step 4: Extract relationships
  const relationships = await extractRelationships(
    content,
    {
      people: initialExtraction.people,
      locations: initialExtraction.locations,
      companies: initialExtraction.companies,
      programs: initialExtraction.programs,
    },
    defaultModel
  );

  // Step 5: Combine extraction with relationships
  const finalExtraction: EntityExtractionResponse = {
    ...initialExtraction,
    relationships,
  };

  // Step 6: Populate Neo4j (will be done via sync functions after entities are saved to Supabase)
  // Note: populateNeo4jFromExtraction is not called here because we need Supabase IDs first
  // The sync will happen automatically when entities are saved via API routes or manually via sync functions

  return {
    ...finalExtraction,
    graphContext: {
      similarEntities: similarEntities.length,
      suggestedRelationships: relationships.length,
    },
  };
}
