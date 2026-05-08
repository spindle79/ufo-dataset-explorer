/**
 * Named Entity Recognition (NER) using Hugging Face
 * Baseline entity extraction with span anchoring
 * Supports both remote (HF Inference API) and local (@xenova/transformers) inference
 */

import { HfInference } from '@huggingface/inference';
import type { Span } from '../entity-schemas';
import { NERError } from './errors';

export interface NEREntity {
  text: string;
  label: string;
  start: number;
  end: number;
  score: number;
}

// Map HF labels to our entity types
const LABEL_MAPPING: Record<string, 'PERSON' | 'LOCATION' | 'ORG' | 'MISC'> = {
  PER: 'PERSON',
  PERSON: 'PERSON',
  LOC: 'LOCATION',
  LOCATION: 'LOCATION',
  GPE: 'LOCATION', // Geopolitical entity
  ORG: 'ORG',
  ORGANIZATION: 'ORG',
  MISC: 'MISC',
};

// Map standard HF model names to Xenova equivalents for local inference
const MODEL_MAPPING: Record<string, string> = {
  'dslim/bert-base-NER': 'Xenova/bert-base-NER',
  'dslim/bert-base-ner': 'Xenova/bert-base-NER',
  'bert-base-NER': 'Xenova/bert-base-NER',
};

/**
 * Extract entities using local NER (local or remote)
 */
async function extractWithNER(
  content: string,
  model: string = 'dslim/bert-base-NER'
): Promise<NEREntity[]> {
  const provider = process.env.NER_PROVIDER || 'huggingface';
  
  if (provider === 'local') {
    return extractWithLocalNER(content, model);
  } else {
    return extractWithRemoteNER(content, model);
  }
}

/**
 * Extract entities using local NER with @xenova/transformers
 */
async function extractWithLocalNER(
  content: string,
  model: string = 'dslim/bert-base-NER'
): Promise<NEREntity[]> {
  const startTime = Date.now();
  try {
    // Map model name to Xenova equivalent if needed
    // Xenova models are optimized for Transformers.js and have different naming
    let localModel = MODEL_MAPPING[model] || MODEL_MAPPING[model.toLowerCase()];
    
    if (!localModel) {
      // If model already starts with Xenova/, use it as-is
      if (model.startsWith('Xenova/')) {
        localModel = model;
      } else {
        // Default to Xenova/bert-base-NER for local inference
        // This is the optimized version of dslim/bert-base-NER
        localModel = 'Xenova/bert-base-NER';
        console.log(`[Local NER] Mapping model "${model}" to "${localModel}" for local inference`);
      }
    } else {
      console.log(`[Local NER] Using mapped model "${localModel}" (from "${model}")`);
    }
    
    // Dynamically import @xenova/transformers to avoid loading if not needed
    const importStart = Date.now();
    const { pipeline } = await import('@xenova/transformers');
    const importTime = Date.now() - importStart;
    console.log(`[Local NER] Imported @xenova/transformers in ${importTime}ms`);
    
    console.log(`[Local NER] Creating pipeline with model: ${localModel}`);
    const pipelineStart = Date.now();
    
    // Create token classification pipeline
    // Use Xenova model variant for local inference (optimized for Transformers.js)
    // First time: ~4 seconds to download/load model, subsequent: instant (cached)
    const ner = await pipeline('token-classification', localModel);
    const pipelineTime = Date.now() - pipelineStart;
    console.log(`[Local NER] Pipeline created in ${pipelineTime}ms (first time includes model download)`);
    
    console.log(`[Local NER] Running inference on ${content.length} characters`);
    const inferenceStart = Date.now();
    
    // Run inference
    // Expected: ~87ms for typical text after warmup, longer for first run
    const result = await ner(content);
    const inferenceTime = Date.now() - inferenceStart;
    console.log(`[Local NER] Inference completed in ${inferenceTime}ms`);
    
    // Convert to our format
    const convertStart = Date.now();
    const entities = convertTokensToEntities(result, content);
    const convertTime = Date.now() - convertStart;
    const totalTime = Date.now() - startTime;
    
    console.log(`[Local NER] Converted ${entities.length} entities in ${convertTime}ms`);
    console.log(`[Local NER] Total time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    
    if (entities.length > 0) {
      console.log(`[Local NER] Found entities:`, entities.map(e => `${e.text} (${e.label}, score: ${e.score.toFixed(2)})`).join(', '));
    } else {
      console.log(`[Local NER] No entities found`);
    }
    
    return entities;
  } catch (error: any) {
    console.warn('Local NER failed, falling back to pattern extraction:', error?.message || String(error));
    return extractWithPatterns(content);
  }
}

/**
 * Extract entities using Hugging Face Inference API
 */
async function extractWithRemoteNER(
  content: string,
  model: string = 'dslim/bert-base-NER'
): Promise<NEREntity[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  // If no API key is provided, skip NER and use pattern extraction
  if (!apiKey || apiKey.trim() === '') {
    console.warn('HUGGINGFACE_API_KEY not set, skipping NER and using pattern extraction');
    return extractWithPatterns(content);
  }

  // HfInference v4.x automatically uses router.huggingface.co
  // The library handles the endpoint routing automatically
  const hf = new HfInference(apiKey);

  try {
    // Use token classification API
    const result = await hf.tokenClassification({
      model,
      inputs: content,
    });

    // Handle both array and object responses
    const tokens = Array.isArray(result) ? result : (result as any).tokens || [];

    // Convert token-level results to spans
    return convertTokensToEntities(tokens, content);
  } catch (error: any) {
    // Fallback to pattern-based extraction if NER fails
    const errorMessage = error?.message || String(error);
    const isAuthError = errorMessage.includes('Invalid username or password') || 
                       errorMessage.includes('authentication') ||
                       errorMessage.includes('401') ||
                       errorMessage.includes('403');
    
    if (isAuthError) {
      console.warn('HF NER authentication failed. Please check your HUGGINGFACE_API_KEY. Falling back to pattern extraction.');
    } else {
      console.warn('HF NER failed, falling back to pattern extraction:', errorMessage);
    }
    return extractWithPatterns(content);
  }
}

/**
 * Convert token classification results to entity spans
 */
function convertTokensToEntities(
  tokens: any[],
  content: string
): NEREntity[] {
  const entities: NEREntity[] = [];
  let currentEntity: {
    text: string;
    label: string;
    start: number;
    end: number;
    scores: number[];
  } | null = null;

  let charOffset = 0;

  for (const token of tokens) {
    // Handle different response formats (HF API vs @xenova/transformers)
    const tokenText = (token as any).word || (token as any).entity || (token as any).text || '';
    const tokenLabel = (token as any).entity_group || (token as any).label || (token as any).entity || '';
    const tokenScore = (token as any).score || 0;
    const tokenStart = (token as any).start ?? content.indexOf(tokenText, charOffset);
    const tokenEnd = (token as any).end ?? (tokenStart !== -1 ? tokenStart + tokenText.length : 0);

    if (tokenStart === -1 || !tokenText) {
      // Token not found, skip
      continue;
    }

    // Map BILOU tags (B-PER, I-PER, etc.) and entity labels
    let label = 'MISC';
    const upperLabel = tokenLabel.toUpperCase();
    
    if (upperLabel.startsWith('B-') || upperLabel.startsWith('I-')) {
      // BILOU format: B-PER, I-PER, etc.
      const entityType = upperLabel.substring(2);
      label = LABEL_MAPPING[entityType] || 'MISC';
    } else if (upperLabel.startsWith('O')) {
      // Outside tag - skip
      if (currentEntity) {
        entities.push({
          text: currentEntity.text.trim(),
          label: currentEntity.label,
          start: currentEntity.start,
          end: currentEntity.end,
          score:
            currentEntity.scores.reduce((a, b) => a + b, 0) /
            currentEntity.scores.length,
        });
        currentEntity = null;
      }
      continue;
    } else {
      // Direct label format
      label = LABEL_MAPPING[tokenLabel] || 'MISC';
    }

    // Check if this token continues the current entity
    if (
      currentEntity &&
      currentEntity.label === label &&
      Math.abs(tokenStart - currentEntity.end) <= 1 // Allow for spaces
    ) {
      // Continue current entity
      const space = tokenStart > currentEntity.end ? ' ' : '';
      currentEntity.text += space + tokenText;
      currentEntity.end = Math.max(currentEntity.end, tokenEnd);
      currentEntity.scores.push(tokenScore);
    } else {
      // Save previous entity if exists
      if (currentEntity) {
        entities.push({
          text: currentEntity.text.trim(),
          label: currentEntity.label,
          start: currentEntity.start,
          end: currentEntity.end,
          score:
            currentEntity.scores.reduce((a, b) => a + b, 0) /
            currentEntity.scores.length,
        });
      }

      // Start new entity (only if it's a named entity, not O tag)
      if (label !== 'MISC' || upperLabel.startsWith('B-') || upperLabel.startsWith('I-')) {
        currentEntity = {
          text: tokenText,
          label: label === 'MISC' ? 'MISC' : label,
          start: tokenStart,
          end: tokenEnd,
          scores: [tokenScore],
        };
      } else {
        currentEntity = null;
      }
    }

    charOffset = Math.max(charOffset, tokenEnd);
  }

  // Add last entity
  if (currentEntity) {
    entities.push({
      text: currentEntity.text.trim(),
      label: currentEntity.label,
      start: currentEntity.start,
      end: currentEntity.end,
      score:
        currentEntity.scores.reduce((a, b) => a + b, 0) /
        currentEntity.scores.length,
    });
  }

  return entities.filter((e) => e.text.length > 0);
}

/**
 * Fallback pattern-based extraction
 */
function extractWithPatterns(content: string): NEREntity[] {
  const entities: NEREntity[] = [];

  // Simple capitalized word patterns
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  let match;

  while ((match = capitalizedPattern.exec(content)) !== null) {
    entities.push({
      text: match[0],
      label: 'MISC',
      start: match.index,
      end: match.index + match[0].length,
      score: 0.5,
    });
  }

  return entities;
}

// Export the main function
export { extractWithNER };
