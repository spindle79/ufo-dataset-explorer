/**
 * Heuristic Entity Extraction
 * Pattern-based extraction to catch entities missed by NER
 */

export interface HeuristicEntity {
  text: string;
  start: number;
  end: number;
  type: 'CANDIDATE';
  pattern: string;
}

// Common words to filter out
const COMMON_WORDS = new Set([
  'The',
  'This',
  'That',
  'These',
  'Those',
  'And',
  'But',
  'Or',
  'For',
  'With',
  'From',
  'To',
  'In',
  'On',
  'At',
  'By',
  'Of',
  'As',
  'Is',
  'Are',
  'Was',
  'Were',
  'Be',
  'Been',
  'Being',
  'Have',
  'Has',
  'Had',
  'Do',
  'Does',
  'Did',
  'Will',
  'Would',
  'Could',
  'Should',
  'May',
  'Might',
  'Must',
  'Can',
  'Cannot',
]);

/**
 * Extract proper nouns and capitalized phrases
 */
export function extractProperNouns(content: string): HeuristicEntity[] {
  const candidates: HeuristicEntity[] = [];

  // Pattern 1: Capitalized words (potential entities)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  let match;

  while ((match = capitalizedPattern.exec(content)) !== null) {
    const text = match[0];
    if (!isCommonWord(text) && text.length > 2) {
      candidates.push({
        text,
        start: match.index,
        end: match.index + text.length,
        type: 'CANDIDATE',
        pattern: 'capitalized',
      });
    }
  }

  // Pattern 2: Titles + Names (Dr., President, CEO, etc.)
  const titlePattern =
    /\b(?:Dr|Mr|Mrs|Ms|Prof|President|CEO|CFO|CTO|Sen|Rep|Gov|Mayor|Judge|General|Colonel|Captain|Lieutenant|Sergeant)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi;
  while ((match = titlePattern.exec(content)) !== null) {
    candidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: 'CANDIDATE',
      pattern: 'title+name',
    });
  }

  // Pattern 3: Organizations (X Inc., Y University, etc.)
  const orgPattern =
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|LLC|Corp|Corporation|University|College|Labs|Laboratory|Institute|Foundation|Association|Society|Organization|Group|Company|Co)\b/gi;
  while ((match = orgPattern.exec(content)) !== null) {
    candidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: 'CANDIDATE',
      pattern: 'organization',
    });
  }

  // Pattern 4: Locations (City of X, Lake Y, Mount Z, etc.)
  const locationPattern =
    /\b(?:City|Town|Village|County|State|Province|Country|Lake|River|Mount|Mountain|Bay|Gulf|Ocean|Sea|Island|Islands|Peninsula|Cape|Point|Valley|Canyon|Desert|Forest|Park|National|International|Airport|Station|University|College|Hospital|Museum|Library|Theater|Theatre|Stadium|Arena|Center|Centre|Plaza|Square|Street|Avenue|Boulevard|Road|Drive|Lane|Court|Place|Parkway)\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi;
  while ((match = locationPattern.exec(content)) !== null) {
    candidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: 'CANDIDATE',
      pattern: 'location',
    });
  }

  // Pattern 5: Geographic features
  const geoPattern =
    /\b(?:Lake|River|Mount|Mountain|Bay|Gulf|Ocean|Sea|Island|Islands|Peninsula|Cape|Point|Valley|Canyon|Desert|Forest)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi;
  while ((match = geoPattern.exec(content)) !== null) {
    candidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: 'CANDIDATE',
      pattern: 'geographic',
    });
  }

  // Pattern 6: Programs/Projects (Project X, Operation Y, etc.)
  const programPattern =
    /\b(?:Project|Program|Operation|Initiative|Campaign|Mission|Task|Force|Team|Committee|Commission|Board|Panel|Group|Study|Research|Analysis|Investigation|Review|Report|Plan|Strategy|Policy|System|Framework|Protocol|Standard|Guideline|Procedure|Process|Method|Approach|Solution)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi;
  while ((match = programPattern.exec(content)) !== null) {
    candidates.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: 'CANDIDATE',
      pattern: 'program',
    });
  }

  // Remove duplicates by position
  const uniqueCandidates = deduplicateByPosition(candidates);

  return uniqueCandidates;
}

/**
 * Check if a word is a common word
 */
function isCommonWord(text: string): boolean {
  const words = text.split(/\s+/);
  return words.some((word) => COMMON_WORDS.has(word));
}

/**
 * Deduplicate candidates by position (same start/end)
 */
function deduplicateByPosition(
  candidates: HeuristicEntity[]
): HeuristicEntity[] {
  const seen = new Map<string, HeuristicEntity>();

  for (const candidate of candidates) {
    const key = `${candidate.start}-${candidate.end}`;
    if (!seen.has(key) || candidate.text.length > seen.get(key)!.text.length) {
      seen.set(key, candidate);
    }
  }

  return Array.from(seen.values());
}

/**
 * Merge NER and heuristic results
 */
export function mergeCandidates(
  nerEntities: Array<{ text: string; start: number; end: number }>,
  heuristicEntities: HeuristicEntity[]
): Array<{
  text: string;
  start: number;
  end: number;
  source: 'NER' | 'HEURISTIC';
  label?: string;
}> {
  const merged = new Map<string, any>();

  // Add NER entities
  for (const entity of nerEntities) {
    const key = `${entity.start}-${entity.end}`;
    merged.set(key, {
      ...entity,
      source: 'NER' as const,
    });
  }

  // Add heuristic entities (only if not already present)
  for (const entity of heuristicEntities) {
    const key = `${entity.start}-${entity.end}`;
    if (!merged.has(key)) {
      merged.set(key, {
        text: entity.text,
        start: entity.start,
        end: entity.end,
        source: 'HEURISTIC' as const,
        label: 'UNKNOWN',
      });
    }
  }

  return Array.from(merged.values());
}
