/**
 * Enhanced Entity Extraction Pipeline
 * Combines NER, heuristics, LLM refinement, and normalization
 */

import { extractWithNER } from './ner';
import { extractProperNouns, mergeCandidates } from './heuristics';
import {
  normalizePeople,
  normalizeLocations,
  normalizeCompanies,
  normalizePrograms,
} from './normalization';
import { extractSpansFromText, validateSpans, mergeOverlappingSpans } from './spans';
import { extractEntities } from '../entity-extraction';
import { getDefaultModel, getLLMConfig } from '../llm/config';
import type { EntityExtractionResponse } from '../entity-schemas';

/**
 * Enhanced entity extraction with NER baseline and LLM refinement
 */
export async function extractEntitiesEnhanced(
  content: string,
  model?: string
): Promise<EntityExtractionResponse> {
  const config = getLLMConfig();
  const defaultModel = model || getDefaultModel(config.provider);
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required and cannot be empty');
  }

  // Step 1: NER baseline (fast, deterministic)
  // Expected: ~87ms for local inference after warmup, ~1-2s for remote API
  const nerStart = Date.now();
  let nerEntities: Array<{ text: string; start: number; end: number; label: string }> = [];
  try {
    const nerResults = await extractWithNER(content);
    nerEntities = nerResults.map((e) => ({
      text: e.text,
      start: e.start,
      end: e.end,
      label: e.label,
    }));
    const nerTime = Date.now() - nerStart;
    console.log(`[Entity Extraction] NER completed in ${nerTime}ms, found ${nerEntities.length} entities`);
  } catch (error) {
    const nerTime = Date.now() - nerStart;
    console.warn(`[Entity Extraction] NER extraction failed after ${nerTime}ms, continuing with heuristics:`, error);
  }

  // Step 2: Proper noun heuristics (widen recall)
  const heuristicEntities = extractProperNouns(content);

  // Step 3: Merge candidates
  const candidates = mergeCandidates(nerEntities, heuristicEntities);

  // Step 4: Build candidate context for LLM
  const candidateText = candidates
    .map(
      (c) =>
        `[${c.start}-${c.end}] "${c.text}" (${c.label || 'CANDIDATE'}, source: ${c.source})`
    )
    .join('\n');

  // Step 5: LLM refinement with span anchoring
  // Expected: 1-10+ seconds depending on content length and OpenAI API response time
  const llmStart = Date.now();
  const enhancedPrompt = `Extract entities from the text. Use the candidate entities (with character spans) as hints, but only include entities that actually appear in the text.

Candidate entities with spans:
${candidateText}

CRITICAL RULES:
1. Only extract entities that appear in the text (verify using spans)
2. Provide canonical names (e.g., "NYC" → "New York City")
3. Extract aliases (e.g., "Sam Altman" → canonical: "Samuel Altman", aliases: ["Sam", "Altman"])
4. For locations, extract coordinates, city, state, country if mentioned
5. For programs, include description if context is available

Return JSON matching this schema:
{
  "people": [{"name": "canonical", "aliases": ["alias1"]}],
  "locations": [{"name": "canonical", "aliases": ["alias1"], "latitude": number|null, "longitude": number|null, "address": "string|null", "city": "string|null", "state": "string|null", "country": "string|null"}],
  "companies": [{"name": "canonical", "aliases": ["alias1"]}],
  "programs": [{"name": "canonical", "aliases": ["alias1"], "description": "string|null"}]
}`;

  // Use existing extractEntities but with enhanced prompt
  console.log(`[Entity Extraction] Starting LLM refinement (${content.length} chars, ${candidates.length} candidates)`);
  const llmResponse = await extractEntities(enhancedPrompt + '\n\nText:\n' + content, defaultModel);
  const llmTime = Date.now() - llmStart;
  console.log(`[Entity Extraction] LLM refinement completed in ${llmTime}ms (${(llmTime/1000).toFixed(2)}s)`);
  console.log(`[Entity Extraction] LLM found: ${llmResponse.people.length} people, ${llmResponse.locations.length} locations, ${llmResponse.companies.length} companies, ${llmResponse.programs.length} programs`);
  
  if (llmResponse.people.length > 0) {
    console.log(`[Entity Extraction] People:`, llmResponse.people.map(p => `${p.name}${p.aliases?.length ? ` (aliases: ${p.aliases.join(', ')})` : ''}`).join(', '));
  }
  if (llmResponse.locations.length > 0) {
    console.log(`[Entity Extraction] Locations:`, llmResponse.locations.map(l => `${l.name}${l.aliases?.length ? ` (aliases: ${l.aliases.join(', ')})` : ''}${l.city ? ` [${l.city}, ${l.state || ''}]` : ''}`).join(', '));
  }
  if (llmResponse.companies.length > 0) {
    console.log(`[Entity Extraction] Companies:`, llmResponse.companies.map(c => `${c.name}${c.aliases?.length ? ` (aliases: ${c.aliases.join(', ')})` : ''}`).join(', '));
  }
  if (llmResponse.programs.length > 0) {
    console.log(`[Entity Extraction] Programs:`, llmResponse.programs.map(p => `${p.name}${p.aliases?.length ? ` (aliases: ${p.aliases.join(', ')})` : ''}`).join(', '));
  }

  // Step 6: Extract spans for all entities
  const peopleWithSpans = llmResponse.people.map((person) => {
    const spans = extractSpansFromText(content, person.name, person.aliases || []);
    const validated = validateSpans(spans, content.length);
    const merged = mergeOverlappingSpans(validated);
    return {
      ...person,
      spans: merged,
    };
  });

  const locationsWithSpans = llmResponse.locations.map((location) => {
    const spans = extractSpansFromText(content, location.name, location.aliases || []);
    const validated = validateSpans(spans, content.length);
    const merged = mergeOverlappingSpans(validated);
    return {
      ...location,
      spans: merged,
    };
  });

  const companiesWithSpans = llmResponse.companies.map((company) => {
    const spans = extractSpansFromText(content, company.name, company.aliases || []);
    const validated = validateSpans(spans, content.length);
    const merged = mergeOverlappingSpans(validated);
    return {
      ...company,
      spans: merged,
    };
  });

  const programsWithSpans = llmResponse.programs.map((program) => {
    const spans = extractSpansFromText(content, program.name, program.aliases || []);
    const validated = validateSpans(spans, content.length);
    const merged = mergeOverlappingSpans(validated);
    return {
      ...program,
      spans: merged,
    };
  });

  // Step 7: Normalize entities
  const normalizedPeople = normalizePeople(peopleWithSpans);
  const normalizedLocations = normalizeLocations(locationsWithSpans);
  const normalizedCompanies = normalizeCompanies(companiesWithSpans);
  const normalizedPrograms = normalizePrograms(programsWithSpans);

  return {
    people: normalizedPeople,
    locations: normalizedLocations,
    companies: normalizedCompanies,
    programs: normalizedPrograms,
    relationships: [], // Will be added by relationship extraction step
  };
}
