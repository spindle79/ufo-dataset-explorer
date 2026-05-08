/**
 * Generate descriptions using LLM (OpenAI or Ollama)
 * Creates concise 2-4 sentence descriptions from scraped/transcribed content
 */

import { getLLMClient } from "./llm/client";
import { getDefaultModel, getLLMConfig } from "./llm/config";

/**
 * Generate a description from content using LLM (OpenAI or Ollama)
 * @param content The scraped or transcribed content to summarize
 * @param model The model to use (defaults based on configured provider)
 * @returns A 2-4 sentence description
 */
export async function generateDescription(
  content: string,
  model?: string
): Promise<string> {
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

  const systemPrompt = `You are a helpful assistant. Your task is to create a very concise description in headline + subtitle format. Maximum 2 sentences. Be specific and informative.`;

  const userPrompt = `Create a very concise description in headline + subtitle format (maximum 2 sentences) that captures the essence of this content:

${truncatedContent}`;

  try {
    const response = await client.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: defaultModel,
        temperature: config.provider === 'ollama' ? 0.7 : undefined,
      }
    );

    const description = response.content;

    if (!description) {
      throw new Error(
        `Failed to generate description: empty response from ${config.provider}`
      );
    }

    return description;
  } catch (error) {
    console.error(`Error generating description with ${config.provider}:`, error);
    if (error instanceof Error && error.message.includes("empty response")) {
      throw error;
    }
    throw new Error(
      `Failed to generate description: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
