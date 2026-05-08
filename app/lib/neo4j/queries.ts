/**
 * Neo4j Cypher Query Functions
 * Functions for creating and querying entities, documents, and relationships
 */

import neo4j from 'neo4j-driver';
import {
  getNeo4jSession,
  executeWriteTransaction,
  executeReadTransaction,
} from './client';

export type EntityType = 'Person' | 'Location' | 'Company' | 'Program';
export type SourceType = 'pdf' | 'audio' | 'video' | 'scrape';
export type RelationshipType =
  | 'MENTIONED_IN'
  | 'WORKS_AT'
  | 'LOCATED_IN'
  | 'RELATED_TO'
  | 'CO_OCCURS_WITH'
  | 'PART_OF';

/**
 * Create or update an entity node
 */
export async function createEntityNode(
  entityType: EntityType,
  entityId: string,
  name: string,
  aliases: string[] = [],
  additionalProperties: Record<string, any> = {}
): Promise<void> {
  await executeWriteTransaction(async (tx) => {
    // Filter out null and undefined values from additionalProperties
    const filteredProperties = Object.fromEntries(
      Object.entries(additionalProperties).filter(
        ([_, value]) => value !== null && value !== undefined
      )
    );

    const props = {
      id: entityId,
      name,
      aliases: aliases || [],
      ...filteredProperties,
      updatedAt: new Date().toISOString(),
    };

    const setClause = Object.keys(filteredProperties).length > 0
      ? Object.keys(filteredProperties)
          .map((key) => `, e.${key} = $${key}`)
          .join('\n')
      : '';

    await tx.run(
      `
      MERGE (e:${entityType} {id: $id})
      SET e.name = $name,
          e.aliases = $aliases,
          e.updatedAt = $updatedAt${setClause}
      `,
      props
    );
  });
}

/**
 * Create or update a document node
 */
export async function createDocumentNode(
  documentId: string,
  sourceType: SourceType,
  properties: Record<string, any> = {}
): Promise<void> {
  await executeWriteTransaction(async (tx) => {
    const props = {
      id: documentId,
      sourceType,
      ...properties,
      updatedAt: new Date().toISOString(),
    };

    const setClause = Object.keys(properties)
      .map((key) => `d.${key} = $${key}`)
      .join(', ');

    await tx.run(
      `
      MERGE (d:Document {id: $id, sourceType: $sourceType})
      SET d.updatedAt = $updatedAt
      ${setClause ? `, ${setClause}` : ''}
      `,
      props
    );
  });
}

/**
 * Create a MENTIONED_IN relationship between entity and document
 */
export async function createMentionedInRelationship(
  entityType: EntityType,
  entityId: string,
  documentId: string,
  sourceType: SourceType
): Promise<void> {
  await executeWriteTransaction(async (tx) => {
    await tx.run(
      `
      MATCH (e:${entityType} {id: $entityId})
      MATCH (d:Document {id: $documentId, sourceType: $sourceType})
      MERGE (e)-[r:MENTIONED_IN]->(d)
      SET r.createdAt = coalesce(r.createdAt, datetime())
      `,
      { entityId, documentId, sourceType }
    );
  });
}

/**
 * Create a relationship between two entities
 */
export async function createEntityRelationship(
  entityType1: EntityType,
  entityId1: string,
  relationshipType: RelationshipType,
  entityType2: EntityType,
  entityId2: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await executeWriteTransaction(async (tx) => {
    const props = {
      entityId1,
      entityId2,
      ...properties,
      createdAt: new Date().toISOString(),
    };

    const setClause = Object.keys(properties)
      .map((key) => `r.${key} = $${key}`)
      .join(', ');

    await tx.run(
      `
      MATCH (e1:${entityType1} {id: $entityId1})
      MATCH (e2:${entityType2} {id: $entityId2})
      MERGE (e1)-[r:${relationshipType}]->(e2)
      SET r.createdAt = coalesce(r.createdAt, datetime())
      ${setClause ? `, ${setClause}` : ''}
      `,
      props
    );
  });
}

/**
 * Create co-occurrence relationships between entities that appear in the same documents
 */
export async function createCoOccurrenceRelationships(
  minCoOccurrences: number = 2
): Promise<number> {
  let count = 0;

  await executeWriteTransaction(async (tx) => {
    // People co-occurrence
    const peopleResult = await tx.run(
      `
      MATCH (p1:Person)-[:MENTIONED_IN]->(doc:Document)<-[:MENTIONED_IN]-(p2:Person)
      WHERE p1 <> p2
      WITH p1, p2, count(DISTINCT doc) as coOccurrences
      WHERE coOccurrences >= $minCoOccurrences
      MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
      SET r.count = coOccurrences,
          r.weight = coOccurrences,
          r.updatedAt = datetime()
      RETURN count(r) as created
      `,
      { minCoOccurrences }
    );
    count += Number(peopleResult.records[0]?.get('created') || 0);

    // Locations co-occurrence
    const locationsResult = await tx.run(
      `
      MATCH (l1:Location)-[:MENTIONED_IN]->(doc:Document)<-[:MENTIONED_IN]-(l2:Location)
      WHERE l1 <> l2
      WITH l1, l2, count(DISTINCT doc) as coOccurrences
      WHERE coOccurrences >= $minCoOccurrences
      MERGE (l1)-[r:CO_OCCURS_WITH]->(l2)
      SET r.count = coOccurrences,
          r.weight = coOccurrences,
          r.updatedAt = datetime()
      RETURN count(r) as created
      `,
      { minCoOccurrences }
    );
    count += Number(locationsResult.records[0]?.get('created') || 0);

    // Companies co-occurrence
    const companiesResult = await tx.run(
      `
      MATCH (c1:Company)-[:MENTIONED_IN]->(doc:Document)<-[:MENTIONED_IN]-(c2:Company)
      WHERE c1 <> c2
      WITH c1, c2, count(DISTINCT doc) as coOccurrences
      WHERE coOccurrences >= $minCoOccurrences
      MERGE (c1)-[r:CO_OCCURS_WITH]->(c2)
      SET r.count = coOccurrences,
          r.weight = coOccurrences,
          r.updatedAt = datetime()
      RETURN count(r) as created
      `,
      { minCoOccurrences }
    );
    count += Number(companiesResult.records[0]?.get('created') || 0);

    // Programs co-occurrence
    const programsResult = await tx.run(
      `
      MATCH (pr1:Program)-[:MENTIONED_IN]->(doc:Document)<-[:MENTIONED_IN]-(pr2:Program)
      WHERE pr1 <> pr2
      WITH pr1, pr2, count(DISTINCT doc) as coOccurrences
      WHERE coOccurrences >= $minCoOccurrences
      MERGE (pr1)-[r:CO_OCCURS_WITH]->(pr2)
      SET r.count = coOccurrences,
          r.weight = coOccurrences,
          r.updatedAt = datetime()
      RETURN count(r) as created
      `,
      { minCoOccurrences }
    );
    count += Number(programsResult.records[0]?.get('created') || 0);
  });

  return count;
}

/**
 * Find similar entities by name or alias
 */
export async function findSimilarEntities(
  name: string,
  entityTypes: EntityType[] = ['Person', 'Location', 'Company', 'Program'],
  limit: number = 10
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    aliases: string[];
    score: number;
  }>
> {
  return await executeReadTransaction(async (tx) => {
    const typeFilter = entityTypes.map((t) => `:${t}`).join('');
    // Ensure limit is a Neo4j integer (Neo4j requires integer for LIMIT)
    const limitInt = neo4j.int(Math.floor(limit));

    const result = await tx.run(
      `
      MATCH (e${typeFilter})
      WHERE e.name CONTAINS $name 
         OR $name IN e.aliases
         OR any(alias IN e.aliases WHERE alias CONTAINS $name)
         OR e.name =~ $pattern
      WITH e,
           CASE 
             WHEN e.name = $name THEN 1.0
             WHEN $name IN e.aliases THEN 0.9
             WHEN e.name CONTAINS $name THEN 0.8
             ELSE 0.7
           END as score
      RETURN e.id as id, e.name as name, labels(e)[0] as type, e.aliases as aliases, score
      ORDER BY score DESC
      LIMIT $limitInt
      `,
      {
        name,
        pattern: `(?i).*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`,
        limitInt,
      }
    );

    return result.records.map((record: any) => ({
      id: record.get('id'),
      name: record.get('name'),
      type: record.get('type'),
      aliases: record.get('aliases') || [],
      score: record.get('score'),
    }));
  });
}

/**
 * Get full graph context for an entity
 */
export async function getEntityGraph(
  entityId: string,
  entityType: EntityType,
  depth: number = 2
): Promise<{
  nodes: Array<{
    id: string;
    labels: string[];
    properties: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
  }>;
}> {
  return await executeReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH path = (start:${entityType} {id: $entityId})-[*1..${depth}]-(connected)
      WHERE ALL(r in relationships(path) WHERE type(r) IN ['MENTIONED_IN', 'WORKS_AT', 'LOCATED_IN', 'RELATED_TO', 'CO_OCCURS_WITH', 'PART_OF'])
      WITH path, start, connected
      UNWIND relationships(path) as rel
      WITH DISTINCT start, connected, rel
      RETURN start, connected, rel
      LIMIT 1000
      `,
      { entityId }
    );

    const nodeMap = new Map<string, any>();
    const edges: Array<{
      source: string;
      target: string;
      type: string;
      properties: Record<string, any>;
    }> = [];

    for (const record of result.records) {
      const start = record.get('start');
      const connected = record.get('connected');
      const rel = record.get('rel');

      if (start) {
        nodeMap.set(start.properties.id, {
          id: start.properties.id,
          labels: start.labels,
          properties: start.properties,
        });
      }

      if (connected) {
        nodeMap.set(connected.properties.id, {
          id: connected.properties.id,
          labels: connected.labels,
          properties: connected.properties,
        });
      }

      if (rel && start && connected) {
        edges.push({
          source: start.properties.id,
          target: connected.properties.id,
          type: rel.type,
          properties: rel.properties,
        });
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  });
}

/**
 * Suggest relationships based on graph patterns
 */
export async function suggestRelationships(
  entityIds: string[],
  minPathLength: number = 3
): Promise<
  Array<{
    entity1: string;
    entity2: string;
    pathLength: number;
    relationshipTypes: string[];
  }>
> {
  if (entityIds.length < 2) {
    return [];
  }

  return await executeReadTransaction(async (tx) => {
    const suggestions: Array<{
      entity1: string;
      entity2: string;
      pathLength: number;
      relationshipTypes: string[];
    }> = [];

    for (let i = 0; i < entityIds.length; i++) {
      for (let j = i + 1; j < entityIds.length; j++) {
        const result = await tx.run(
          `
          MATCH path = shortestPath(
            (e1 {id: $id1})-[*..${minPathLength}]-(e2 {id: $id2})
          )
          WHERE length(path) > 0
          RETURN length(path) as pathLength,
                 [r in relationships(path) | type(r)] as relationshipTypes
          LIMIT 1
          `,
          { id1: entityIds[i], id2: entityIds[j] }
        );

        if (result.records.length > 0) {
          const record = result.records[0];
          suggestions.push({
            entity1: entityIds[i],
            entity2: entityIds[j],
            pathLength: record.get('pathLength'),
            relationshipTypes: record.get('relationshipTypes'),
          });
        }
      }
    }

    return suggestions;
  });
}

/**
 * Get graph statistics
 */
export async function getGraphStats(): Promise<{
  nodeCounts: Record<string, number>;
  relationshipCounts: Record<string, number>;
  mostConnected: Array<{
    id: string;
    name: string;
    type: string;
    degree: number;
  }>;
}> {
  return await executeReadTransaction(async (tx) => {
    // Node counts
    const nodeCountsResult = await tx.run(
      `
      MATCH (n)
      RETURN labels(n)[0] as label, count(n) as count
      `
    );

    const nodeCounts: Record<string, number> = {};
    for (const record of nodeCountsResult.records) {
      nodeCounts[record.get('label')] = record.get('count');
    }

    // Relationship counts
    const relCountsResult = await tx.run(
      `
      MATCH ()-[r]->()
      RETURN type(r) as type, count(r) as count
      `
    );

    const relationshipCounts: Record<string, number> = {};
    for (const record of relCountsResult.records) {
      relationshipCounts[record.get('type')] = record.get('count');
    }

    // Most connected entities
    const mostConnectedResult = await tx.run(
      `
      MATCH (e)
      WHERE e:Person OR e:Location OR e:Company OR e:Program
      WITH e, size((e)--()) as degree
      WHERE degree > 0
      RETURN e.id as id, e.name as name, labels(e)[0] as type, degree
      ORDER BY degree DESC
      LIMIT 10
      `
    );

    const mostConnected = mostConnectedResult.records.map((record: any) => ({
      id: record.get('id'),
      name: record.get('name'),
      type: record.get('type'),
      degree: record.get('degree'),
    }));

    return {
      nodeCounts,
      relationshipCounts,
      mostConnected,
    };
  });
}
