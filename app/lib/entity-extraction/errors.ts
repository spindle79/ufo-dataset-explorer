/**
 * Entity Extraction Error Types
 * Custom errors for the extraction pipeline
 */

export class NERError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'NERError';
  }
}

export class HeuristicExtractionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'HeuristicExtractionError';
  }
}

export class NormalizationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'NormalizationError';
  }
}

export class RelationshipExtractionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'RelationshipExtractionError';
  }
}

export class SpanValidationError extends Error {
  constructor(message: string, public span?: { start: number; end: number }) {
    super(message);
    this.name = 'SpanValidationError';
  }
}
