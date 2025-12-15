/**
 * AnswerAgent Integration
 * 
 * This module provides utilities for connecting to AnswerAgent
 * and integrating it with the UFO dataset explorer.
 */

export interface AnswerAgentConfig {
  apiUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export interface AnswerAgentQuery {
  question: string;
  context?: Record<string, any>;
  filters?: Record<string, any>;
}

export interface AnswerAgentResponse {
  answer: string;
  sources?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Default AnswerAgent configuration
 */
const defaultConfig: AnswerAgentConfig = {
  apiUrl: process.env.ANSWERAGENT_API_URL || 'https://api.answeragent.com',
  apiKey: process.env.ANSWERAGENT_API_KEY,
  timeout: 30000,
};

/**
 * Query AnswerAgent with a question about the UFO dataset
 */
export async function queryAnswerAgent(
  query: AnswerAgentQuery,
  config: AnswerAgentConfig = {}
): Promise<AnswerAgentResponse> {
  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.apiKey) {
    throw new Error('AnswerAgent API key is required. Set ANSWERAGENT_API_KEY environment variable.');
  }

  try {
    const response = await fetch(`${finalConfig.apiUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalConfig.apiKey}`,
      },
      body: JSON.stringify({
        question: query.question,
        context: query.context,
        filters: query.filters,
      }),
      signal: AbortSignal.timeout(finalConfig.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`AnswerAgent API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as AnswerAgentResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query AnswerAgent: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Connect AnswerAgent to the UFO dataset
 * This function sets up the integration and returns connection status
 */
export async function connectAnswerAgent(
  config: AnswerAgentConfig = {}
): Promise<{ connected: boolean; message: string }> {
  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.apiKey) {
    return {
      connected: false,
      message: 'AnswerAgent API key not configured',
    };
  }

  try {
    // Test connection
    const response = await fetch(`${finalConfig.apiUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalConfig.apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        connected: true,
        message: 'Successfully connected to AnswerAgent',
      };
    } else {
      return {
        connected: false,
        message: `Connection failed: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      connected: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Example integration pattern for using AnswerAgent with dataset queries
 */
export async function queryDatasetWithAnswerAgent(
  question: string,
  datasetFilters?: Record<string, any>
): Promise<AnswerAgentResponse> {
  // First, get relevant data from the dataset
  const datasetContext = {
    filters: datasetFilters,
    source: 'ufo-dataset',
  };

  // Query AnswerAgent with the question and context
  return await queryAnswerAgent({
    question,
    context: datasetContext,
    filters: datasetFilters,
  });
}

