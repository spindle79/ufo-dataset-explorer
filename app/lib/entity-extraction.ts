/**
 * Entity extraction using OpenAI GPT-5-nano
 * Extracts People, Locations, Companies, and Programs from content
 */

import OpenAI from "openai";
import {
  entityExtractionResponseSchema,
  type EntityExtractionResponse,
} from "./entity-schemas";

const DEFAULT_MODEL = "gpt-5-nano";

/**
 * Extract entities from content using OpenAI GPT-5-nano
 * @param content The content to extract entities from (transcription, markdown, etc.)
 * @param model The OpenAI model to use (defaults to gpt-5-nano)
 * @returns Extracted entities with strongly enforced schema
 */
export async function extractEntities(
  content: string,
  model: string = DEFAULT_MODEL
): Promise<EntityExtractionResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  if (!content || content.trim().length === 0) {
    throw new Error("Content is required and cannot be empty");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Truncate content if it's too long (gpt-5-nano has context limits)
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

Rules:
- Return ONLY valid JSON, no markdown, no code blocks, no explanation
- All arrays can be empty if no entities found
- Aliases should include alternative names, abbreviations, nicknames
- For locations, extract coordinates only if explicitly mentioned
- For programs, include description if context is available
- Be thorough but accurate - only extract entities that are clearly mentioned
- If an entity appears multiple times, include it only once with all aliases combined`;

  const userPrompt = `Extract all entities from the following content:

${truncatedContent}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0, // Use deterministic output for consistent parsing
    });

    const responseText = response.choices[0]?.message?.content?.trim() || "";

    if (!responseText) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", responseText);
      throw new Error(
        `Invalid JSON response from OpenAI: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`
      );
    }

    // Validate and parse with Zod schema
    const validatedResponse =
      entityExtractionResponseSchema.parse(parsedResponse);

    return validatedResponse;
  } catch (error) {
    console.error("Error extracting entities with OpenAI:", error);
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
