/**
 * Data Access Abstraction Layer
 * 
 * This module provides an abstraction for accessing UFO sighting data.
 * Currently implemented with filesystem access, but designed to be easily
 * replaceable with a database implementation.
 */

import { UFOSighting } from "./dataset";

export interface DataAccess {
  /**
   * Get a single record by UID
   */
  getById(uid: string): Promise<UFOSighting | null>;

  /**
   * Get multiple records by UIDs
   */
  getByIds(uids: string[]): Promise<UFOSighting[]>;

  /**
   * Get all records (with optional filtering)
   * Returns an async iterator for memory efficiency
   */
  getAll(filters?: Record<string, any>): AsyncGenerator<UFOSighting, void, unknown>;

  /**
   * Get total count of records
   */
  getCount(filters?: Record<string, any>): Promise<number>;

  /**
   * Check if data is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Filesystem-based implementation
 * Stores each record as a separate JSON file
 */
export class FilesystemDataAccess implements DataAccess {
  private dataDir: string;

  constructor(dataDir: string = "data/records") {
    this.dataDir = dataDir;
  }

  private getFilePath(uid: string): string {
    // Sanitize UID for filesystem (replace / with _)
    const safeUid = uid.replace(/\//g, "_");
    return `${this.dataDir}/${safeUid}.json`;
  }

  async getById(uid: string): Promise<UFOSighting | null> {
    const fs = await import("fs/promises");
    const path = await import("path");
    
    try {
      const filePath = path.join(process.cwd(), this.getFilePath(uid));
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as UFOSighting;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async getByIds(uids: string[]): Promise<UFOSighting[]> {
    const results = await Promise.all(
      uids.map((uid) => this.getById(uid))
    );
    return results.filter((r): r is UFOSighting => r !== null);
  }

  async* getAll(
    filters?: Record<string, any>
  ): AsyncGenerator<UFOSighting, void, unknown> {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      const dirPath = path.join(process.cwd(), this.dataDir);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const filePath = path.join(dirPath, file);
          const content = await fs.readFile(filePath, "utf-8");
          const record = JSON.parse(content) as UFOSighting;

          // Apply filters if provided
          if (filters && !this.matchesFilters(record, filters)) {
            continue;
          }

          yield record;
        } catch (error) {
          // Skip invalid files
          console.warn(`Error reading file ${file}:`, error);
          continue;
        }
      }
    } catch (error) {
      // Directory doesn't exist or other error
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async getCount(filters?: Record<string, any>): Promise<number> {
    let count = 0;
    for await (const _ of this.getAll(filters)) {
      count++;
    }
    return count;
  }

  async isAvailable(): Promise<boolean> {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      const dirPath = path.join(process.cwd(), this.dataDir);
      await fs.access(dirPath);
      const files = await fs.readdir(dirPath);
      return files.filter((f: string) => f.endsWith(".json")).length > 0;
    } catch {
      return false;
    }
  }

  private matchesFilters(
    record: UFOSighting,
    filters: Record<string, any>
  ): boolean {
    if (filters.state && record.state?.toLowerCase() !== filters.state.toLowerCase()) {
      return false;
    }
    if (
      filters.country &&
      record.country?.toLowerCase() !== filters.country.toLowerCase()
    ) {
      return false;
    }
    if (filters.clusterId !== undefined && record.cluster_id !== filters.clusterId) {
      return false;
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      if (new Date(record.t_utc) < fromDate) return false;
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      if (new Date(record.t_utc) > toDate) return false;
    }
    if (filters.latMin !== undefined && record.lat < filters.latMin) {
      return false;
    }
    if (filters.latMax !== undefined && record.lat > filters.latMax) {
      return false;
    }
    if (filters.lonMin !== undefined && record.lon < filters.lonMin) {
      return false;
    }
    if (filters.lonMax !== undefined && record.lon > filters.lonMax) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !record.text?.toLowerCase().includes(searchLower) &&
        !record.city?.toLowerCase().includes(searchLower) &&
        !record.state?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Get the default data access instance
 * Can be swapped for database implementation later
 */
let dataAccessInstance: DataAccess | null = null;

export function getDataAccess(): DataAccess {
  if (!dataAccessInstance) {
    dataAccessInstance = new FilesystemDataAccess();
  }
  return dataAccessInstance;
}

/**
 * Set a custom data access implementation
 * Useful for testing or switching to database
 */
export function setDataAccess(access: DataAccess): void {
  dataAccessInstance = access;
}

