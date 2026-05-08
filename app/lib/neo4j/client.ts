/**
 * Neo4j Client Singleton
 * Manages Neo4j driver connection with retry logic and health checks
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import {
  Neo4jConnectionError,
  retryWithBackoff,
  isTransientError,
} from './errors';

let driver: Driver | null = null;
let isShuttingDown = false;

// Force driver recreation on password change
let lastPassword: string | null = null;

/**
 * Get or create Neo4j driver singleton
 */
export function getNeo4jDriver(): Driver {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'neo4j';
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  // If driver exists and password hasn't changed, reuse it
  if (driver && !isShuttingDown) {
    if (lastPassword === password) {
      return driver;
    }
    // Password changed - close old driver
    driver.close().catch(() => {});
    driver = null;
  }

  lastPassword = password;

  if (!uri || !user || !password) {
    throw new Neo4jConnectionError(
      'Neo4j configuration missing. Please set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD environment variables.'
    );
  }

  try {
    // For Neo4j 4.0+, encryption is enabled by default
    // For local development, we disable encryption
    // Allow override via environment variable
    const encryptionEnv = process.env.NEO4J_ENCRYPTED;
    let encryption: boolean | undefined;
    
    if (encryptionEnv !== undefined) {
      encryption = encryptionEnv === 'true';
    } else {
      // Auto-detect: disable encryption for localhost connections
      const isLocal = uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('0.0.0.0');
      encryption = isLocal ? false : undefined; // Disable for local, use default for remote
    }
    
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      database: database,
      encrypted: encryption,
    });

    // Verify connectivity
    driver.verifyConnectivity().catch((error: unknown) => {
      console.warn('Neo4j initial connectivity check failed:', error);
      // Don't throw - allow lazy connection
    });

    return driver;
  } catch (error) {
    throw new Neo4jConnectionError(
      `Failed to create Neo4j driver: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get a Neo4j session
 */
export async function getNeo4jSession(): Promise<Session> {
  const driver = getNeo4jDriver();
  return driver.session();
}

/**
 * Execute a query with automatic retry on transient errors
 */
export async function executeQuery<T>(
  query: string,
  parameters?: Record<string, any>,
  session?: Session
): Promise<T[]> {
  const useProvidedSession = !!session;
  const sessionToUse = session || (await getNeo4jSession());

  try {
    return await retryWithBackoff(async () => {
      const result = await sessionToUse.run(query, parameters);
      return result.records.map((record: any) => record.toObject() as T);
    });
  } catch (error) {
    if (error instanceof Error && isTransientError(error)) {
      throw new Neo4jConnectionError(
        `Neo4j query failed after retries: ${error.message}`,
        error
      );
    }
    throw error;
  } finally {
    if (!useProvidedSession) {
      await sessionToUse.close();
    }
  }
}

/**
 * Execute a write transaction
 */
export async function executeWriteTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const session = await getNeo4jSession();
  try {
    return await session.executeWrite(callback);
  } finally {
    await session.close();
  }
}

/**
 * Execute a read transaction
 */
export async function executeReadTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const session = await getNeo4jSession();
  try {
    return await session.executeRead(callback);
  } finally {
    await session.close();
  }
}

/**
 * Health check for Neo4j connection
 */
export async function checkNeo4jHealth(): Promise<boolean> {
  try {
    const driver = getNeo4jDriver();
    await driver.verifyConnectivity();
    return true;
  } catch (error) {
    console.error('Neo4j health check failed:', error);
    return false;
  }
}

/**
 * Gracefully shutdown Neo4j driver
 */
export async function shutdownNeo4j(): Promise<void> {
  isShuttingDown = true;
  if (driver) {
    try {
      await driver.close();
      driver = null;
    } catch (error) {
      console.error('Error shutting down Neo4j driver:', error);
    }
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await shutdownNeo4j();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownNeo4j();
    process.exit(0);
  });
}
