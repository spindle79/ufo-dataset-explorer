import { createClient } from '@/lib/supabase/server';
import { AiGenerationCreate } from '@/lib/supabase-types';

/**
 * Get the next version number for an AI generation
 */
export async function getNextGenerationVersion(
  sourceType: string,
  sourceId: string,
  generationType: string
): Promise<number> {
  const supabase = await createClient();
  const { data: existingGenerations } = await supabase
    .from('ai_generations')
    .select('version')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('generation_type', generationType)
    .order('version', { ascending: false })
    .limit(1);

  return existingGenerations && existingGenerations.length > 0
    ? existingGenerations[0].version + 1
    : 1;
}

/**
 * Create AI generation data structure
 */
export function createGenerationData(
  sourceType: string,
  sourceId: string,
  generationType: string,
  version: number,
  textContent: string,
  metadata: Record<string, any>
): AiGenerationCreate {
  return {
    source_type: sourceType,
    source_id: sourceId,
    generation_type: generationType,
    version,
    text_content: textContent,
    metadata,
  };
}

/**
 * Generate a generation type string from service and prefix
 */
export function generateGenerationType(prefix: string, service: string): string {
  return `${prefix}-${service}`;
}

