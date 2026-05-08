/**
 * LLM Provider Configuration
 * Supports switching between OpenAI and local LLM providers (Ollama)
 */

export type LLMProvider = 'openai' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  openai?: {
    apiKey: string;
    baseURL?: string;
  };
  ollama?: {
    baseURL: string;
    defaultModel?: string;
  };
}

/**
 * Get LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider;

  if (provider === 'ollama') {
    return {
      provider: 'ollama',
      ollama: {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b',
      },
    };
  }

  // Default to OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY not configured. Set LLM_PROVIDER=ollama to use local models, or configure OPENAI_API_KEY.'
    );
  }

  return {
    provider: 'openai',
    openai: {
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL, // Optional custom base URL
    },
  };
}

/**
 * Get the default model for the configured provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  if (provider === 'ollama') {
    return process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b';
  }
  return 'gpt-5-nano';
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  if (provider === 'ollama') {
    // We'll check availability when making requests
    return true;
  }
  return !!process.env.OPENAI_API_KEY;
}
