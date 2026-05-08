/**
 * LLM Client Abstraction Layer
 * Provides a unified interface for OpenAI and Ollama (local LLM) providers
 */

import OpenAI from 'openai';
import { getLLMConfig, getDefaultModel, type LLMProvider } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Map OpenAI model names to Ollama equivalents
 */
function mapModelToOllama(modelName: string, defaultOllamaModel: string): string {
  // If it's already an Ollama model name (contains :), use it as-is
  if (modelName.includes(':')) {
    return modelName;
  }
  
  // Map OpenAI model names to Ollama equivalents
  const modelMap: Record<string, string> = {
    'gpt-5-nano': defaultOllamaModel,
    'gpt-5-mini': defaultOllamaModel,
    'gpt-5': defaultOllamaModel,
    'gpt-4o-mini': defaultOllamaModel,
    'gpt-4o': defaultOllamaModel,
    'gpt-4': defaultOllamaModel,
    'gpt-3.5-turbo': defaultOllamaModel,
  };
  
  // If it's a known OpenAI model, map it; otherwise use default
  return modelMap[modelName.toLowerCase()] || defaultOllamaModel;
}

/**
 * Extract JSON from a response that may contain text before/after the JSON
 */
function extractJSONFromResponse(response: string): string {
  // First, try to remove markdown code blocks
  let cleaned = response
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Check if response is too short or incomplete (just "{")
  if (cleaned.length < 10 || cleaned === '{' || cleaned.startsWith('{') && !cleaned.includes('}')) {
    throw new Error('Incomplete JSON response from Ollama. The response appears to be truncated. Try increasing maxTokens or using a different model.');
  }

  // Try to find JSON object in the response
  // Look for the first { and last } that form a valid JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
    
    // Validate it's complete JSON by checking brace balance
    const openBraces = (jsonCandidate.match(/{/g) || []).length;
    const closeBraces = (jsonCandidate.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      throw new Error('Incomplete JSON response: mismatched braces. The response may have been truncated.');
    }
    
    // Try to parse it to validate it's JSON
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch (parseError) {
      // If parsing fails, check if it's incomplete
      if (jsonCandidate.length < 50) {
        throw new Error('Incomplete JSON response: response is too short and cannot be parsed.');
      }
      // Otherwise, let the error bubble up
      throw parseError;
    }
  }

  // If no JSON found, try to extract from common patterns
  // Look for JSON after keywords like "Response:", "JSON:", etc.
  const jsonPatterns = [
    /(?:Response|JSON|Result|Output)[:\s]*(\{[\s\S]*\})/i,
    /(\{[\s\S]*"people"[\s\S]*\})/i, // Look for our specific schema
    /(\{[\s\S]*"locations"[\s\S]*\})/i,
  ];

  for (const pattern of jsonPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        return match[1];
      } catch {
        // Continue to next pattern
      }
    }
  }

  // If all else fails, throw an error with helpful message
  throw new Error(`Could not extract valid JSON from response. Response starts with: ${cleaned.substring(0, 100)}...`);
}

/**
 * Unified LLM client that works with both OpenAI and Ollama
 */
export class LLMClient {
  private config: ReturnType<typeof getLLMConfig>;
  private openaiClient?: OpenAI;
  private ollamaBaseURL: string;

  constructor() {
    this.config = getLLMConfig();
    
    if (this.config.provider === 'openai' && this.config.openai) {
      this.openaiClient = new OpenAI({
        apiKey: this.config.openai.apiKey,
        baseURL: this.config.openai.baseURL,
      });
    }
    
    this.ollamaBaseURL = this.config.ollama?.baseURL || 'http://localhost:11434';
  }

  /**
   * Get the current provider
   */
  getProvider(): LLMProvider {
    return this.config.provider;
  }

  /**
   * Create a chat completion
   */
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    if (this.config.provider === 'ollama') {
      return this.chatWithOllama(messages, options);
    } else {
      return this.chatWithOpenAI(messages, options);
    }
  }

  /**
   * Chat with OpenAI
   */
  private async chatWithOpenAI(
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || getDefaultModel('openai');
    
    const response = await this.openaiClient.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      response_format: options.responseFormat,
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return {
      content,
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Chat with Ollama (local LLM)
   */
  private async chatWithOllama(
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    // Map OpenAI model names to Ollama equivalents if needed
    const defaultOllamaModel = getDefaultModel('ollama');
    const requestedModel = options.model || defaultOllamaModel;
    const model = mapModelToOllama(requestedModel, defaultOllamaModel);
    const url = `${this.ollamaBaseURL}/api/chat`;

    // Convert messages to Ollama format
    // Ollama uses a different format - we need to combine system and user messages
    let systemMessage = '';
    const userMessages: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else if (msg.role === 'user') {
        userMessages.push(msg.content);
      } else if (msg.role === 'assistant') {
        // Ollama doesn't support assistant messages in the same way
        // We'll include it in the context
        userMessages.push(`[Previous response]: ${msg.content}`);
      }
    }

    // Combine system message with user messages
    const combinedContent = systemMessage
      ? `${systemMessage}\n\n${userMessages.join('\n\n')}`
      : userMessages.join('\n\n');

    // For JSON mode, we need to add very explicit instructions to the prompt
    let prompt = combinedContent;
    if (options.responseFormat?.type === 'json_object') {
      // Make the JSON requirement extremely explicit
      const jsonInstruction = `\n\nCRITICAL INSTRUCTIONS:
- You MUST respond with ONLY a valid JSON object
- Do NOT include any text before or after the JSON
- Do NOT use markdown code blocks
- Do NOT include explanations, summaries, or any other text
- Start your response with { and end with }
- Return ONLY the JSON object, nothing else

Your response must be valid JSON that can be parsed directly.`;
      
      prompt = `${systemMessage}${jsonInstruction}\n\n${userMessages.join('\n\n')}`;
    }

    // For JSON responses, use streaming to ensure we get the complete response
    const useStreaming = options.responseFormat?.type === 'json_object';
    
    const requestBody: any = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: useStreaming,
      options: {
        temperature: options.temperature ?? (options.responseFormat?.type === 'json_object' ? 0.1 : 0.7),
        // For JSON responses, ensure we have enough tokens (default to 8192 for JSON to prevent truncation)
        num_predict: options.maxTokens ?? (options.responseFormat?.type === 'json_object' ? 8192 : undefined),
        // Prevent early stopping for JSON responses to ensure complete output
        stop: options.responseFormat?.type === 'json_object' ? [] : undefined,
      },
    };

    // Some Ollama models support format parameter for JSON
    // This should force JSON output even with streaming
    if (options.responseFormat?.type === 'json_object') {
      requestBody.format = 'json';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama API error (${response.status}): ${errorText}`
        );
      }

      let content = '';
      let modelName = model;
      let done = false;
      let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;

      if (useStreaming) {
        // Handle streaming response for JSON to ensure completeness
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('Failed to get response reader for streaming');
        }

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                content += data.message.content;
              }
              if (data.model) {
                modelName = data.model;
              }
              if (data.done === true) {
                done = true;
                // Get usage stats from final message
                if (data.prompt_eval_count || data.eval_count) {
                  usage = {
                    promptTokens: data.prompt_eval_count,
                    completionTokens: data.eval_count,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                  };
                }
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      } else {
        // Non-streaming response
        const data = await response.json();
        content = data.message?.content?.trim() || '';
        modelName = data.model || model;
        done = data.done !== false;
        
        if (data.prompt_eval_count || data.eval_count) {
          usage = {
            promptTokens: data.prompt_eval_count,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          };
        }
        
        if (!done) {
          console.warn('Ollama response may be incomplete (done: false)');
        }
      }

      // Clean up JSON response if needed
      if (options.responseFormat?.type === 'json_object') {
        // Check if response is clearly not JSON (starts with text explanation)
        if (content && !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
          // Check if it looks like the model ignored JSON format requirement
          const lowerContent = content.toLowerCase();
          if (lowerContent.includes('seems like') || 
              lowerContent.includes('i\'ll help') || 
              lowerContent.includes('let me') ||
              lowerContent.startsWith('it ') ||
              lowerContent.startsWith('the ')) {
            throw new Error(
              'Ollama model ignored JSON format requirement and returned text instead of JSON. ' +
              'This may indicate:\n' +
              '1. The model does not support format: json parameter\n' +
              '2. The prompt needs to be more explicit\n' +
              '3. Try using a different model (e.g., llama3.1:70b or qwen2.5:7b)\n' +
              '4. Consider using OpenAI for JSON extraction tasks\n' +
              `Response preview: ${content.substring(0, 200)}...`
            );
          }
        }
        
        // Check if response looks incomplete
        if (!content || content === '{' || (content.startsWith('{') && !content.includes('}'))) {
          if (!done) {
            throw new Error(
              'Ollama returned an incomplete JSON response. The stream ended before completion. ' +
              'This may be due to:\n' +
              '1. Token limit too low (try using a model with larger context)\n' +
              '2. Input content too long (try reducing input size)\n' +
              '3. Model stopping early (try a different model or increase num_predict)\n' +
              `Response preview: ${content.substring(0, 100)}`
            );
          }
        }
        // Try to extract JSON from the response
        content = extractJSONFromResponse(content.trim());
      }

      if (!content) {
        throw new Error('Empty response from Ollama');
      }

      return {
        content,
        model: modelName,
        usage,
      };
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a connection error
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Cannot connect to Ollama at ${this.ollamaBaseURL}. Make sure Ollama is running. Install from https://ollama.ai`
          );
        }
        throw error;
      }
      throw new Error(`Failed to chat with Ollama: ${error}`);
    }
  }

  /**
   * Check if Ollama is available
   */
  async checkOllamaAvailability(): Promise<boolean> {
    if (this.config.provider !== 'ollama') {
      return false;
    }

    try {
      const response = await fetch(`${this.ollamaBaseURL}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Get a singleton LLM client instance
 */
let clientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!clientInstance) {
    clientInstance = new LLMClient();
  }
  return clientInstance;
}
