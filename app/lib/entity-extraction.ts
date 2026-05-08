/**
 * Entity extraction using LLM (OpenAI or Ollama)
 * Extracts People, Locations, Companies, and Programs from content
 */

import { getLLMClient } from "./llm/client";
import { getDefaultModel, getLLMConfig } from "./llm/config";
import {
  entityExtractionResponseSchema,
  type EntityExtractionResponse,
} from "./entity-schemas";

/**
 * Extract entities from content using LLM (OpenAI or Ollama)
 * @param content The content to extract entities from (transcription, markdown, etc.)
 * @param model The model to use (defaults based on configured provider)
 * @returns Extracted entities with strongly enforced schema
 */
export async function extractEntities(
  content: string,
  model?: string
): Promise<EntityExtractionResponse> {
  if (!content || content.trim().length === 0) {
    throw new Error("Content is required and cannot be empty");
  }

  const config = getLLMConfig();
  const defaultModel = model || getDefaultModel(config.provider);
  const client = getLLMClient();

  // Truncate content if it's too long (context limits vary by model)
  // Keep first 100k characters to stay within reasonable limits
  const truncatedContent =
    content.length > 100000 ? content.substring(0, 100000) + "..." : content;

  const systemPrompt = `You are an expert entity extraction assistant. Your task is to identify and extract entities from the provided content.

Extract the following types of entities:
1. PEOPLE: Names of individuals mentioned (include aliases/nicknames)
2. LOCATIONS: Geographic locations, places, addresses (include coordinates if mentioned, city/state/country)
3. COMPANIES: Company names, organizations, corporations (include aliases like "Apple Inc." for "Apple")
4. PROGRAMS: Programs, projects, initiatives, operations (include descriptions if available)

CRITICAL: You MUST return a valid JSON object matching this EXACT schema:
{
  "people": [{"name": "string", "aliases": ["string"]}],
  "locations": [{"name": "string", "aliases": ["string"], "latitude": number|null, "longitude": number|null, "address": "string|null", "city": "string|null", "state": "string|null", "country": "string|null"}],
  "companies": [{"name": "string", "aliases": ["string"]}],
  "programs": [{"name": "string", "aliases": ["string"], "description": "string|null"}]
}

ABSOLUTE REQUIREMENTS - READ CAREFULLY:
- You MUST respond with ONLY valid JSON - NO TEXT, NO EXPLANATIONS, NO SUMMARIES
- Do NOT write "It seems like..." or "I'll help you..." or any conversational text
- Do NOT include any text before or after the JSON
- Do NOT use markdown code blocks (no \`\`\`json or \`\`\`)
- Your response MUST start with the character { and end with }
- Return ONLY the JSON object - nothing else, no matter what
- COMPLETE the entire JSON object - do not stop mid-response
- All arrays can be empty if no entities found (use [] not null)
- Aliases should include alternative names, abbreviations, nicknames
- For locations, extract coordinates only if explicitly mentioned
- For programs, include description if context is available
- Be thorough but accurate - only extract entities that are clearly mentioned
- If an entity appears multiple times, include it only once with all aliases combined
- Keep the response concise but complete - ensure all closing braces are included

CRITICAL: Your response format is JSON. You are configured to return JSON only. 
Do NOT provide explanations, summaries, or any text. Start with { and end with }.
Your entire response must be valid JSON that can be parsed directly.`;

  const userPrompt = `Extract all entities from the following content:

${truncatedContent}`;

  try {
    const response = await client.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: defaultModel,
        responseFormat: { type: "json_object" },
        temperature: config.provider === 'ollama' ? 0.1 : undefined, // Lower temperature for more deterministic results
        maxTokens: config.provider === 'ollama' ? 8192 : undefined, // Ensure enough tokens for complete JSON response (increased for Ollama)
      }
    );

    const responseText = response.content;

    if (!responseText) {
      throw new Error(`Empty response from ${config.provider}`);
    }

    // Parse JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", responseText);
      const errorMessage = parseError instanceof Error ? parseError.message : "Unknown error";
      
      // Provide helpful error message for incomplete JSON
      if (errorMessage.includes('position') || errorMessage.includes('Unexpected') || responseText.length < 50) {
        throw new Error(
          `Incomplete JSON response from ${config.provider}. The model may have been cut off. ` +
          `Response preview: ${responseText.substring(0, 200)}... ` +
          `Try using a model with a larger context window or reducing the input size.`
        );
      }
      
      throw new Error(
        `Invalid JSON response from ${config.provider}: ${errorMessage}`
      );
    }

    // Validate and parse with Zod schema
    const validatedResponse =
      entityExtractionResponseSchema.parse(parsedResponse);

    return validatedResponse;
  } catch (error) {
    console.error(`Error extracting entities with ${config.provider}:`, error);
    if (error instanceof Error) {
      // If it's a Zod validation error, provide more details
      if (error.message.includes("ZodError") || error.name === "ZodError") {
        throw new Error(
          `Entity extraction validation failed: ${error.message}. Please ensure the response matches the required schema.`
        );
      }
      throw error;
    }
    throw new Error(
      `Failed to extract entities: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
