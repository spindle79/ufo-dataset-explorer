/**
 * Neo4j Error Handling
 * Custom error types and retry logic for Neo4j operations
 */

export class Neo4jConnectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'Neo4jConnectionError';
  }
}

export class Neo4jQueryError extends Error {
  constructor(message: string, public query?: string, public cause?: Error) {
    super(message);
    this.name = 'Neo4jQueryError';
  }
}

export class Neo4jTimeoutError extends Error {
  constructor(message: string, public timeout?: number) {
    super(message);
    this.name = 'Neo4jTimeoutError';
  }
}

/**
 * Check if an error is a transient Neo4j error that should be retried
 */
export function isTransientError(error: Error): boolean {
  const transientPatterns = [
    'ServiceUnavailable',
    'TransientError',
    'DatabaseUnavailable',
    'Connection',
    'timeout',
    'ECONNREFUSED',
    'ENOTFOUND',
  ];

  const errorMessage = error.message.toLowerCase();
  return transientPatterns.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !isTransientError(lastError)) {
        throw lastError;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}
