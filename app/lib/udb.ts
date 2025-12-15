/**
 * uDb (UFO Database) Integration Wrapper
 *
 * This module provides a wrapper around the @rr0/udb package to make it
 * easy to query the *U* UFO database from within this Next.js application.
 *
 * The uDb package reads binary .RND files from the Larry Hatch UFO database,
 * which is different from the Hugging Face dataset used elsewhere in this project.
 *
 * This wrapper uses the CLI interface via child_process for reliability and simplicity.
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";

const execAsync = promisify(exec);

// Type definition for UdbRecord based on the package structure
export interface UdbRecord {
  id: number;
  year?: number;
  month?: number;
  day?: number;
  time?: string;
  location?: string;
  stateOrProvince?: string;
  country?: string;
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  credibility?: number;
  strangeness?: number;
  duration?: number;
  [key: string]: any; // Allow additional fields
}

export interface UDbQueryOptions {
  /**
   * Database source: 'udb' for local .RND file, 'nuforc' for NUFORC web reports
   * @default 'udb'
   */
  database?: "udb" | "nuforc";

  /**
   * Source path for 'udb' database (path to U.RND file)
   * Defaults to ./input/db/udb/data/U.RND
   */
  source?: string;

  /**
   * Match criteria in format: "field=value&field=value" or "field=value|field=value"
   * Use & for AND, | for OR
   * Example: "year=1972&month=8&day=12"
   */
  match?: string;

  /**
   * Maximum number of records to return
   */
  maxCount?: number;

  /**
   * Starting record index (1-based)
   * @default 1
   */
  firstIndex?: number;

  /**
   * Output format
   * @default 'json'
   */
  format?: "json" | "csv" | "xml" | "default";

  /**
   * Whether to allow empty results
   * @default false
   */
  allowEmpty?: boolean;
}

export interface UDbQueryResult {
  records: UdbRecord[];
  count: number;
  format: string;
}

/**
 * Parse uDb XML output into UdbRecord objects
 */
function parseUdbXml(xmlContent: string): UdbRecord[] {
  const records: UdbRecord[] = [];
  
  // Extract all <record>...</record> blocks
  const recordRegex = /<record>(.*?)<\/record>/gs;
  const recordMatches = xmlContent.matchAll(recordRegex);
  
  for (const match of recordMatches) {
    const recordXml = match[1];
    const record: UdbRecord = { id: 0 };
    
    // Extract all field values
    const fieldRegex = /<(\w+)>(.*?)<\/\1>/g;
    const fieldMatches = recordXml.matchAll(fieldRegex);
    
    for (const fieldMatch of fieldMatches) {
      const fieldName = fieldMatch[1];
      let fieldValue = fieldMatch[2];
      
      // Decode XML entities
      fieldValue = fieldValue
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      
      // Map XML field names to UdbRecord properties
      switch (fieldName) {
        case "id":
          record.id = parseInt(fieldValue, 10) || 0;
          break;
        case "year":
          record.year = fieldValue ? parseInt(fieldValue, 10) : undefined;
          break;
        case "month":
          record.month = fieldValue ? parseInt(fieldValue, 10) : undefined;
          break;
        case "day":
          record.day = fieldValue ? parseInt(fieldValue, 10) : undefined;
          break;
        case "time":
          record.time = fieldValue || undefined;
          break;
        case "location":
          record.location = fieldValue || undefined;
          break;
        case "stateOrProvince":
          record.stateOrProvince = fieldValue || undefined;
          break;
        case "country":
          record.country = fieldValue || undefined;
          break;
        case "title":
          record.title = fieldValue || undefined;
          break;
        case "description":
          record.description = fieldValue || undefined;
          break;
        case "latitude":
          record.latitude = fieldValue ? parseFloat(fieldValue) : undefined;
          break;
        case "longitude":
          record.longitude = fieldValue ? parseFloat(fieldValue) : undefined;
          break;
        case "credibility":
          record.credibility = fieldValue ? parseInt(fieldValue, 10) : undefined;
          break;
        case "strangeness":
          record.strangeness = fieldValue ? parseInt(fieldValue, 10) : undefined;
          break;
        case "duration":
          record.duration = fieldValue ? parseInt(fieldValue, 10) : undefined;
          break;
        default:
          // Store additional fields
          record[fieldName] = fieldValue;
          break;
      }
    }
    
    if (record.id > 0) {
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Get the default database path
 * Checks in order:
 * 1. Environment variable UDB_DATABASE_PATH
 * 2. node_modules/@rr0/udb/data/udb/input/U.RND (if package includes it)
 * 3. Custom project path: input/db/udb/data/U.RND
 */
function getDefaultDatabasePath(): string {
  // Check environment variable first
  const envPath = process.env.UDB_DATABASE_PATH;
  if (envPath) {
    return path.isAbsolute(envPath)
      ? envPath
      : path.join(process.cwd(), envPath);
  }

  // Check if database is included in the @rr0/udb package
  const packageDbPath = path.join(
    process.cwd(),
    "node_modules",
    "@rr0",
    "udb",
    "data",
    "udb",
    "input",
    "U.RND"
  );

  // Fallback to custom project path
  const customPath = path.join(
    process.cwd(),
    "input",
    "db",
    "udb",
    "data",
    "U.RND"
  );

  // Return package path as default (it will be checked for existence in createInput)
  return packageDbPath;
}

/**
 * Check if uDb database is available
 */
export async function isUDbAvailable(
  database: "udb" | "nuforc" = "udb",
  source?: string
): Promise<boolean> {
  try {
    if (database === "nuforc") {
      // NUFORC is web-based, assume available
      return true;
    }

    const dbPath = source || getDefaultDatabasePath();
    await fs.access(dbPath);
    return true;
  } catch {
    // If default path doesn't exist, try the custom project path as fallback
    if (!source) {
      try {
        const fallbackPath = path.join(
          process.cwd(),
          "input",
          "db",
          "udb",
          "data",
          "U.RND"
        );
        await fs.access(fallbackPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Query the uDb database using the CLI
 *
 * @param options Query options
 * @returns Query results
 */
export async function queryUDb(
  options: UDbQueryOptions = {}
): Promise<UDbQueryResult> {
  const {
    database = "udb",
    source,
    match = "",
    maxCount = 100,
    firstIndex = 1,
    format = "json",
    allowEmpty = false,
  } = options;

  // Use XML format as it's the most structured format supported by uDb CLI
  // The wrapper will parse XML and convert it to JSON-like objects
  const outputFormat = format === "json" ? "xml" : format;

  try {
    // Create a temporary file for output
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(
      tmpDir,
      `udb-query-${Date.now()}-${Math.random().toString(36).substring(7)}.xml`
    );

    try {
      // Build CLI command
      const args: string[] = [];

      // Database type
      args.push(`--database`, database);

      // Source path (if provided and database is udb)
      if (database === "udb" && source) {
        args.push(source);
      }

      // Match criteria
      if (match) {
        args.push(`--match`, match);
      }

      // Count
      args.push(`--count`, maxCount.toString());

      // Format - use XML format (which we'll parse to JSON-like objects)
      args.push(`--format`, outputFormat);

      // Output to temp file
      args.push(`--out`, tmpFile);

      // Build command - use npx to run the CLI
      const cmd = `npx -y @rr0/udb ${args.map((arg) => `"${arg}"`).join(" ")}`;

      // Execute command
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: "/bin/sh",
      });

      if (stderr && !stderr.includes("warning") && !stderr.includes("npm")) {
        console.warn("uDb stderr:", stderr);
      }

      // Read and parse the output file
      let records: UdbRecord[] = [];

      try {
        const fileContent = await fs.readFile(tmpFile, "utf-8");

        if (outputFormat === "xml") {
          // Parse XML format
          records = parseUdbXml(fileContent);
        } else if (outputFormat === "json") {
          // Try to parse as JSON array or single object
          try {
            const parsed = JSON.parse(fileContent);
            if (Array.isArray(parsed)) {
              records = parsed;
            } else if (parsed && typeof parsed === "object") {
              records = [parsed];
            }
          } catch (parseError) {
            // If JSON parsing fails, the file might be in a different format
            // Try to extract JSON records from the content
            const jsonMatches = fileContent.match(/\{[^}]*\}/g);
            if (jsonMatches) {
              records = jsonMatches
                .map((match) => {
                  try {
                    return JSON.parse(match);
                  } catch {
                    return null;
                  }
                })
                .filter((r): r is UdbRecord => r !== null);
            } else {
              throw new Error("Could not parse JSON output from uDb");
            }
          }
        } else {
          throw new Error(`Format ${outputFormat} parsing not yet implemented`);
        }
      } catch (readError) {
        // If file doesn't exist or can't be read, check if command produced output
        if (stdout) {
          // Try to parse stdout as JSON
          try {
            const parsed = JSON.parse(stdout);
            records = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            throw new Error(
              `Failed to read uDb output file and stdout is not valid JSON. File: ${tmpFile}`
            );
          }
        } else {
          throw new Error(
            `Failed to read uDb output file: ${
              readError instanceof Error ? readError.message : String(readError)
            }`
          );
        }
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tmpFile);
        } catch {
          // Ignore cleanup errors
        }
      }

      return {
        records,
        count: records.length,
        format: format === "json" ? "json" : outputFormat,
      };
    } catch (cmdError) {
      // Clean up temp file on error
      try {
        await fs.unlink(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
      throw cmdError;
    }
  } catch (error) {
    // Provide helpful error message
    if (error instanceof Error) {
      if (
        error.message.includes("Command failed") ||
        error.message.includes("ENOENT")
      ) {
        throw new Error(
          `Failed to execute uDb CLI. Make sure @rr0/udb is installed (run: pnpm add @rr0/udb) and the database file is available. Original error: ${error.message}`
        );
      }
      throw error;
    }
    throw new Error(`Failed to query uDb database: ${String(error)}`);
  }
}

/**
 * Get a single record by ID
 */
export async function getUDbRecordById(
  id: number,
  options: Omit<UDbQueryOptions, "match" | "maxCount"> = {}
): Promise<UdbRecord | null> {
  const result = await queryUDb({
    ...options,
    match: `id=${id}`,
    maxCount: 1,
  });

  return result.records.length > 0 ? result.records[0] : null;
}

