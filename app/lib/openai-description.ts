/**
 * Generate descriptions using OpenAI gpt-5-nano model
 * Creates concise 2-4 sentence descriptions from scraped/transcribed content
 */

import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-5-nano";

/**
 * Generate a description from content using OpenAI gpt-5-nano
 * @param content The scraped or transcribed content to summarize
 * @param model The OpenAI model to use (defaults to gpt-5-nano)
 * @returns A 2-4 sentence description
 */
export async function generateDescription(
  content: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
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

  const systemPrompt = `You are a helpful assistant. Your task is to create a very concise description in headline + subtitle format. Maximum 2 sentences. Be specific and informative.`;

  const userPrompt = `Create a very concise description in headline + subtitle format (maximum 2 sentences) that captures the essence of this content:

${truncatedContent}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // No token limit - let the model use what it needs for reasoning and output
    });

    // Log the response structure for debugging
    console.log("OpenAI API response:", JSON.stringify(response, null, 2));

    // Extract description from response
    const description = response.choices[0]?.message?.content?.trim() || "";

    if (!description) {
      console.error("Empty description response. Full response:", response);
      throw new Error(
        `Failed to generate description: empty response. Response structure: ${JSON.stringify(
          response
        )}`
      );
    }

    return description;
  } catch (error) {
    console.error("Error generating description with OpenAI:", error);
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
