/**
 * Span Extraction and Validation Utilities
 * Handle character spans for entity mentions
 */

import type { Span } from '../entity-schemas';

/**
 * Extract all spans for entity mentions in text
 */
export function extractSpansFromText(
  content: string,
  entityName: string,
  aliases: string[] = []
): Span[] {
  const spans: Span[] = [];
  const searchTerms = [entityName, ...aliases].filter(Boolean);

  for (const term of searchTerms) {
    if (!term || term.trim().length === 0) continue;

    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTerm, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        surface: match[0],
      });
    }
  }

  return spans;
}

/**
 * Validate spans are within text bounds
 */
export function validateSpans(spans: Span[], textLength: number): Span[] {
  return spans.filter(
    (span) =>
      span.start >= 0 &&
      span.end <= textLength &&
      span.start < span.end &&
      span.surface.length > 0
  );
}

/**
 * Merge overlapping spans
 */
export function mergeOverlappingSpans(spans: Span[]): Span[] {
  if (spans.length === 0) return [];

  // Sort by start position
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged: Span[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // If overlapping or adjacent, merge
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
      // Keep the longer surface text
      if (current.surface.length > last.surface.length) {
        last.surface = current.surface;
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Get surrounding context for a span
 */
export function getSpanContext(
  content: string,
  span: Span,
  contextLength: number = 50
): string {
  const start = Math.max(0, span.start - contextLength);
  const end = Math.min(content.length, span.end + contextLength);
  return content.substring(start, end);
}

/**
 * Extract all unique spans from multiple entities
 */
export function extractAllSpans(
  content: string,
  entities: Array<{
    name: string;
    aliases?: string[];
  }>
): Map<string, Span[]> {
  const entitySpans = new Map<string, Span[]>();

  for (const entity of entities) {
    const spans = extractSpansFromText(
      content,
      entity.name,
      entity.aliases || []
    );
    const validated = validateSpans(spans, content.length);
    const merged = mergeOverlappingSpans(validated);
    entitySpans.set(entity.name, merged);
  }

  return entitySpans;
}

/**
 * Find spans that overlap with a given range
 */
export function findOverlappingSpans(
  spans: Span[],
  start: number,
  end: number
): Span[] {
  return spans.filter(
    (span) =>
      (span.start >= start && span.start < end) ||
      (span.end > start && span.end <= end) ||
      (span.start <= start && span.end >= end)
  );
}
