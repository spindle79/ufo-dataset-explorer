/**
 * LLM Utility Functions
 */

import { getLLMClient } from './client';
import { getLLMConfig } from './config';

/**
 * Check if the configured LLM provider is available
 */
export async function checkLLMAvailability(): Promise<{
  available: boolean;
  provider: string;
  message: string;
}> {
  const config = getLLMConfig();
  const client = getLLMClient();

  if (config.provider === 'ollama') {
    const isAvailable = await client.checkOllamaAvailability();
    return {
      available: isAvailable,
      provider: 'ollama',
      message: isAvailable
        ? 'Ollama is running and available'
        : `Cannot connect to Ollama at ${config.ollama?.baseURL}. Make sure Ollama is installed and running. Install from https://ollama.ai`,
    };
  } else {
    // OpenAI - check if API key is configured
    const hasApiKey = !!config.openai?.apiKey;
    return {
      available: hasApiKey,
      provider: 'openai',
      message: hasApiKey
        ? 'OpenAI API key is configured'
        : 'OPENAI_API_KEY is not configured',
    };
  }
}

/**
 * Get information about the current LLM configuration
 */
export function getLLMInfo(): {
  provider: string;
  model?: string;
  baseURL?: string;
} {
  const config = getLLMConfig();
  
  if (config.provider === 'ollama') {
    return {
      provider: 'ollama',
      model: config.ollama?.defaultModel,
      baseURL: config.ollama?.baseURL,
    };
  } else {
    return {
      provider: 'openai',
      baseURL: config.openai?.baseURL,
    };
  }
}
