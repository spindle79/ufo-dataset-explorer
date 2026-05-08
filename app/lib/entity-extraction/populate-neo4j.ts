/**
 * Populate Neo4j from Entity Extraction Results
 */

import {
  createEntityNode,
  createDocumentNode,
  createMentionedInRelationship,
  createEntityRelationship,
  createCoOccurrenceRelationships,
  type EntityType,
  type RelationshipType,
} from '../neo4j/queries';
import type { EntityExtractionResponse } from '../entity-schemas';
import type { SourceType } from '../entity-relationships';

/**
 * Populate Neo4j with extracted entities and relationships
 * NOTE: This function uses entity names to find entities in Neo4j.
 * For proper ID mapping, use the sync functions in neo4j/sync.ts after saving to Supabase.
 */
export async function populateNeo4jFromExtraction(
  extraction: EntityExtractionResponse,
  sourceId: string,
  sourceType: SourceType,
  entityIdMap?: {
    people: Map<string, string>; // name -> Supabase ID
    locations: Map<string, string>;
    companies: Map<string, string>;
    programs: Map<string, string>;
  }
): Promise<void> {
  if (!process.env.ENABLE_NEO4J_SYNC || process.env.ENABLE_NEO4J_SYNC !== 'true') {
    return;
  }

  try {
    // Create document node
    await createDocumentNode(sourceId, sourceType, {
      fileName: sourceId,
      createdAt: new Date().toISOString(),
    });

    // Create people nodes and relationships
    for (const person of extraction.people) {
      const personId = entityIdMap?.people.get(person.name) || entityIdMap?.people.get(person.canonicalName || '') || `person-${person.name.toLowerCase().replace(/\s+/g, '-')}`;
      await createEntityNode('Person', personId, person.canonicalName || person.name, person.aliases || []);
      await createMentionedInRelationship('Person', personId, sourceId, sourceType);
    }

    // Create location nodes and relationships
    for (const location of extraction.locations) {
      const locationId = entityIdMap?.locations.get(location.name) || entityIdMap?.locations.get(location.canonicalName || '') || `location-${location.name.toLowerCase().replace(/\s+/g, '-')}`;
      await createEntityNode(
        'Location',
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
      await createMentionedInRelationship('Location', locationId, sourceId, sourceType);
    }

    // Create company nodes and relationships
    for (const company of extraction.companies) {
      const companyId = entityIdMap?.companies.get(company.name) || entityIdMap?.companies.get(company.canonicalName || '') || `company-${company.name.toLowerCase().replace(/\s+/g, '-')}`;
      await createEntityNode('Company', companyId, company.canonicalName || company.name, company.aliases || []);
      await createMentionedInRelationship('Company', companyId, sourceId, sourceType);
    }

    // Create program nodes and relationships
    for (const program of extraction.programs) {
      const programId = entityIdMap?.programs.get(program.name) || entityIdMap?.programs.get(program.canonicalName || '') || `program-${program.name.toLowerCase().replace(/\s+/g, '-')}`;
      await createEntityNode(
        'Program',
        programId,
        program.canonicalName || program.name,
        program.aliases || [],
        {
          description: program.description,
        }
      );
      await createMentionedInRelationship('Program', programId, sourceId, sourceType);
    }

    // Create entity-to-entity relationships (only if we have proper IDs)
    if (entityIdMap) {
      for (const rel of extraction.relationships || []) {
        try {
          const subjectId = findEntityIdInMap(rel.subject, entityIdMap);
          const objectId = findEntityIdInMap(rel.object, entityIdMap);

          if (subjectId && objectId) {
            const subjectType = findEntityTypeFromId(subjectId.id, entityIdMap);
            const objectType = findEntityTypeFromId(objectId.id, entityIdMap);

            if (subjectType && objectType) {
              await createEntityRelationship(
                subjectType,
                subjectId.id,
                rel.predicate as RelationshipType,
                objectType,
                objectId.id,
                {
                  confidence: rel.confidence,
                  evidence: rel.evidence,
                }
              );
            }
          }
        } catch (error) {
          console.error(`Failed to create relationship ${rel.subject} -> ${rel.object}:`, error);
          // Continue with other relationships
        }
      }
    }

    // Create co-occurrence relationships (async, don't wait)
    createCoOccurrenceRelationships(2).catch((error) => {
      console.error('Failed to create co-occurrence relationships:', error);
    });
  } catch (error) {
    console.error('Failed to populate Neo4j from extraction:', error);
    // Don't throw - allow Supabase operations to continue
  }
}

/**
 * Find entity ID from entity ID map
 */
function findEntityIdInMap(
  entityName: string,
  entityIdMap: {
    people: Map<string, string>;
    locations: Map<string, string>;
    companies: Map<string, string>;
    programs: Map<string, string>;
  }
): { id: string; type: EntityType } | null {
  if (entityIdMap.people.has(entityName)) {
    return { id: entityIdMap.people.get(entityName)!, type: 'Person' };
  }
  if (entityIdMap.locations.has(entityName)) {
    return { id: entityIdMap.locations.get(entityName)!, type: 'Location' };
  }
  if (entityIdMap.companies.has(entityName)) {
    return { id: entityIdMap.companies.get(entityName)!, type: 'Company' };
  }
  if (entityIdMap.programs.has(entityName)) {
    return { id: entityIdMap.programs.get(entityName)!, type: 'Program' };
  }
  return null;
}

/**
 * Find entity type from ID
 */
function findEntityTypeFromId(
  entityId: string,
  entityIdMap: {
    people: Map<string, string>;
    locations: Map<string, string>;
    companies: Map<string, string>;
    programs: Map<string, string>;
  }
): EntityType | null {
  for (const [name, id] of entityIdMap.people.entries()) {
    if (id === entityId) return 'Person';
  }
  for (const [name, id] of entityIdMap.locations.entries()) {
    if (id === entityId) return 'Location';
  }
  for (const [name, id] of entityIdMap.companies.entries()) {
    if (id === entityId) return 'Company';
  }
  for (const [name, id] of entityIdMap.programs.entries()) {
    if (id === entityId) return 'Program';
  }
  return null;
}

