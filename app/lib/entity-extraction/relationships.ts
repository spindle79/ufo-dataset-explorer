/**
 * Relationship Extraction
 * LLM-based extraction of relationships between entities
 */

import { getLLMClient } from '../llm/client';
import { getDefaultModel, getLLMConfig } from '../llm/config';
import type { Relationship } from '../entity-schemas';
import { RelationshipExtractionError } from './errors';

/**
 * Extract relationships between entities from content
 */
export async function extractRelationships(
  content: string,
  entities: {
    people: Array<{ name: string }>;
    locations: Array<{ name: string }>;
    companies: Array<{ name: string }>;
    programs: Array<{ name: string }>;
  },
  model?: string
): Promise<Relationship[]> {
  const config = getLLMConfig();
  
  // Check if provider is available
  if (config.provider === 'openai' && !config.openai?.apiKey) {
    console.warn('LLM provider not configured, skipping relationship extraction');
    return [];
  }

  const entityList = [
    ...entities.people.map((p) => `PERSON: ${p.name}`),
    ...entities.locations.map((l) => `LOCATION: ${l.name}`),
    ...entities.companies.map((c) => `COMPANY: ${c.name}`),
    ...entities.programs.map((p) => `PROGRAM: ${p.name}`),
  ].join(', ');

  if (entityList.length === 0) {
    return [];
  }

  const defaultModel = model || getDefaultModel(config.provider);
  const client = getLLMClient();

  const systemPrompt = `You are an expert relationship extraction assistant. Extract explicit relationships between entities from the text.

Relationship types:
- WORKS_AT: Person works at Company
- LOCATED_IN: Entity is located in Location
- MENTIONS: Entity mentions another entity
- RELATED_TO: Entities are related (general relationship)
- PART_OF: Entity is part of Program or Company

CRITICAL RULES:
1. Only extract relationships that are EXPLICITLY stated in the text
2. Do not infer or assume relationships
3. Return valid JSON array only
4. Include confidence score (0.0 to 1.0)
5. Include evidence (snippet from text that supports the relationship)

Return JSON array:
[
  {
    "subject": "Entity Name",
    "predicate": "WORKS_AT",
    "object": "Company Name",
    "confidence": 0.9,
    "evidence": "text snippet"
  }
]`;

  const userPrompt = `Extract relationships between these entities from the text:

Entities:
${entityList}

Text:
${content.substring(0, 50000)}`;

  try {
    const response = await client.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: defaultModel,
        responseFormat: { type: 'json_object' },
        temperature: config.provider === 'ollama' ? 0.1 : undefined,
      }
    );

    const responseText = response.content;

    if (!responseText) {
      return [];
    }

    // Parse JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse relationship extraction JSON:', responseText);
      return [];
    }

    // Handle both array and object with relationships key
    let relationships: any[] = [];
    if (Array.isArray(parsedResponse)) {
      relationships = parsedResponse;
    } else if (parsedResponse.relationships && Array.isArray(parsedResponse.relationships)) {
      relationships = parsedResponse.relationships;
    } else {
      return [];
    }

    // Validate and filter relationships
    const validRelationships: Relationship[] = [];

    for (const rel of relationships) {
      if (
        rel.subject &&
        rel.predicate &&
        rel.object &&
        typeof rel.subject === 'string' &&
        typeof rel.predicate === 'string' &&
        typeof rel.object === 'string'
      ) {
        // Validate entities exist
        const allEntityNames = [
          ...entities.people.map((p) => p.name),
          ...entities.locations.map((l) => l.name),
          ...entities.companies.map((c) => c.name),
          ...entities.programs.map((p) => p.name),
        ];

        const subjectExists =
          allEntityNames.some(
            (name) => name === rel.subject || name.includes(rel.subject) || rel.subject.includes(name)
          );
        const objectExists =
          allEntityNames.some(
            (name) => name === rel.object || name.includes(rel.object) || rel.object.includes(name)
          );

        if (subjectExists && objectExists) {
          validRelationships.push({
            subject: rel.subject,
            predicate: rel.predicate,
            object: rel.object,
            confidence: typeof rel.confidence === 'number' ? rel.confidence : 0.8,
            evidence: typeof rel.evidence === 'string' ? rel.evidence : undefined,
          });
        }
      }
    }

    return validRelationships;
  } catch (error) {
    console.error(`Error extracting relationships with ${config.provider}:`, error);
    if (error instanceof Error) {
      throw new RelationshipExtractionError(
        `Failed to extract relationships: ${error.message}`,
        error
      );
    }
    return [];
  }
}
