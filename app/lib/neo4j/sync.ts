/**
 * Neo4j Sync Utilities
 * Sync entities and relationships from Supabase to Neo4j
 */

import { createAdminClient } from '@/lib/supabase/server';
import {
  createEntityNode,
  createDocumentNode,
  createMentionedInRelationship,
  createEntityRelationship,
  type EntityType,
  type SourceType,
  type RelationshipType,
} from './queries';
import { executeWriteTransaction } from './client';

/**
 * Sync a person entity to Neo4j
 */
export async function syncPersonToNeo4j(
  personId: string,
  name: string,
  aliases: string[] = []
): Promise<void> {
  try {
    await createEntityNode('Person', personId, name, aliases);
  } catch (error) {
    console.error(`Failed to sync person ${personId} to Neo4j:`, error);
    // Don't throw - allow Supabase operations to continue
  }
}

/**
 * Sync a location entity to Neo4j
 */
export async function syncLocationToNeo4j(
  locationId: string,
  name: string,
  aliases: string[] = [],
  additionalData?: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }
): Promise<void> {
  try {
    await createEntityNode('Location', locationId, name, aliases, {
      latitude: additionalData?.latitude,
      longitude: additionalData?.longitude,
      address: additionalData?.address,
      city: additionalData?.city,
      state: additionalData?.state,
      country: additionalData?.country,
    });
  } catch (error) {
    console.error(`Failed to sync location ${locationId} to Neo4j:`, error);
  }
}

/**
 * Sync a company entity to Neo4j
 */
export async function syncCompanyToNeo4j(
  companyId: string,
  name: string,
  aliases: string[] = []
): Promise<void> {
  try {
    await createEntityNode('Company', companyId, name, aliases);
  } catch (error) {
    console.error(`Failed to sync company ${companyId} to Neo4j:`, error);
  }
}

/**
 * Sync a program entity to Neo4j
 */
export async function syncProgramToNeo4j(
  programId: string,
  name: string,
  aliases: string[] = [],
  description?: string | null
): Promise<void> {
  try {
    await createEntityNode('Program', programId, name, aliases, {
      description: description || null,
    });
  } catch (error) {
    console.error(`Failed to sync program ${programId} to Neo4j:`, error);
  }
}

/**
 * Sync a document to Neo4j
 */
export async function syncDocumentToNeo4j(
  documentId: string,
  sourceType: SourceType,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    await createDocumentNode(documentId, sourceType, properties);
  } catch (error) {
    console.error(
      `Failed to sync document ${documentId} to Neo4j:`,
      error
    );
  }
}

/**
 * Sync a person-document relationship to Neo4j
 */
export async function syncPersonRelationshipToNeo4j(
  personId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  try {
    await syncDocumentToNeo4j(sourceId, sourceType);
    await createMentionedInRelationship('Person', personId, sourceId, sourceType);
  } catch (error) {
    console.error(
      `Failed to sync person relationship ${personId} -> ${sourceId} to Neo4j:`,
      error
    );
  }
}

/**
 * Sync a location-document relationship to Neo4j
 */
export async function syncLocationRelationshipToNeo4j(
  locationId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  try {
    await syncDocumentToNeo4j(sourceId, sourceType);
    await createMentionedInRelationship(
      'Location',
      locationId,
      sourceId,
      sourceType
    );
  } catch (error) {
    console.error(
      `Failed to sync location relationship ${locationId} -> ${sourceId} to Neo4j:`,
      error
    );
  }
}

/**
 * Sync a company-document relationship to Neo4j
 */
export async function syncCompanyRelationshipToNeo4j(
  companyId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  try {
    await syncDocumentToNeo4j(sourceId, sourceType);
    await createMentionedInRelationship(
      'Company',
      companyId,
      sourceId,
      sourceType
    );
  } catch (error) {
    console.error(
      `Failed to sync company relationship ${companyId} -> ${sourceId} to Neo4j:`,
      error
    );
  }
}

/**
 * Sync a program-document relationship to Neo4j
 */
export async function syncProgramRelationshipToNeo4j(
  programId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  try {
    await syncDocumentToNeo4j(sourceId, sourceType);
    await createMentionedInRelationship(
      'Program',
      programId,
      sourceId,
      sourceType
    );
  } catch (error) {
    console.error(
      `Failed to sync program relationship ${programId} -> ${sourceId} to Neo4j:`,
      error
    );
  }
}

/**
 * Batch sync entities to Neo4j
 */
export async function batchSyncEntitiesToNeo4j(
  entities: Array<{
    type: EntityType;
    id: string;
    name: string;
    aliases: string[];
    additionalData?: Record<string, any>;
  }>
): Promise<void> {
  if (!process.env.ENABLE_NEO4J_SYNC || process.env.ENABLE_NEO4J_SYNC !== 'true') {
    return;
  }

  await executeWriteTransaction(async (tx) => {
    for (const entity of entities) {
      try {
        await createEntityNode(
          entity.type,
          entity.id,
          entity.name,
          entity.aliases,
          entity.additionalData || {}
        );
      } catch (error) {
        console.error(
          `Failed to batch sync ${entity.type} ${entity.id}:`,
          error
        );
        // Continue with other entities
      }
    }
  });
}

/**
 * Batch sync relationships to Neo4j
 */
export async function batchSyncRelationshipsToNeo4j(
  relationships: Array<{
    entityType: EntityType;
    entityId: string;
    sourceType: SourceType;
    sourceId: string;
  }>
): Promise<void> {
  if (!process.env.ENABLE_NEO4J_SYNC || process.env.ENABLE_NEO4J_SYNC !== 'true') {
    return;
  }

  await executeWriteTransaction(async (tx) => {
    for (const rel of relationships) {
      try {
        await syncDocumentToNeo4j(rel.sourceId, rel.sourceType);
        await createMentionedInRelationship(
          rel.entityType,
          rel.entityId,
          rel.sourceId,
          rel.sourceType
        );
      } catch (error) {
        console.error(
          `Failed to batch sync relationship ${rel.entityType} ${rel.entityId} -> ${rel.sourceId}:`,
          error
        );
        // Continue with other relationships
      }
    }
  });
}
