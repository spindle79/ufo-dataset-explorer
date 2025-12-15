// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

const { snapshotDownload } = require("@huggingface/hub");
const fs = require("fs").promises;
const path = require("path");
const https = require("https");

const DATASET_NAME = "cjc0013/Ufo_data_clustered";
const DATASET_ENCODED = encodeURIComponent(DATASET_NAME);
const OUTPUT_DIR = path.join(process.cwd(), "data", "records");
const API_BASE_URL = "https://datasets-server.huggingface.co";

/**
 * Sanitize UID for use as filename
 */
function sanitizeUid(uid) {
  return uid.replace(/\//g, "_");
}

/**
 * Recursively find files with given extension in directory
 */
async function findFilesRecursive(dir, extension) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subResults = await findFilesRecursive(fullPath, extension);
        results.push(...subResults);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${dir}:`, error.message);
  }
  return results;
}

/**
 * Make HTTP GET request and return JSON response
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Download dataset using Hugging Face Datasets Server API
 * This method streams data directly from the API without downloading files
 */
async function downloadViaAPI() {
  console.log("Using Hugging Face Datasets Server API method...");

  // Get available splits
  const splitsUrl = `${API_BASE_URL}/splits?dataset=${DATASET_ENCODED}`;
  console.log(`Fetching splits from: ${splitsUrl}`);
  const splitsData = await httpsGet(splitsUrl);

  if (!splitsData.splits || splitsData.splits.length === 0) {
    throw new Error("No splits found for this dataset");
  }

  const split = splitsData.splits[0];
  console.log(`Using split: ${split.split} (config: ${split.config})`);

  let count = 0;
  let errors = 0;
  let skippedNoUid = 0;
  const BATCH_SIZE = 100; // API typically returns up to 100 rows per request
  let offset = 0;
  let hasMore = true;
  let firstRecordLogged = false;

  console.log("Downloading records via API...");
  console.log(
    "Note: API pagination may need adjustment based on actual API behavior"
  );

  while (hasMore) {
    try {
      // Build URL - note: offset parameter may not be supported by all API versions
      // If this doesn't work, we may need to use cursor-based pagination
      let url = `${API_BASE_URL}/first-rows?dataset=${DATASET_ENCODED}&config=${encodeURIComponent(
        split.config
      )}&split=${encodeURIComponent(split.split)}&length=${BATCH_SIZE}`;
      if (offset > 0) {
        url += `&offset=${offset}`;
      }

      const response = await httpsGet(url);

      // Log dataset features on first request to verify we have the right dataset
      if (offset === 0 && response.features) {
        const featureNames = response.features.map((f) => f.name).join(", ");
        console.log(`Dataset features: ${featureNames}`);
        // Check if this looks like UFO data (should have uid, t_utc, lat, lon, text)
        const hasUfoFields =
          response.features.some((f) => f.name === "uid") &&
          response.features.some((f) => f.name === "t_utc") &&
          response.features.some((f) => f.name === "text");
        if (!hasUfoFields) {
          console.warn(
            "WARNING: Dataset features don't match expected UFO dataset structure!"
          );
          console.warn("Expected fields: uid, t_utc, lat, lon, text, etc.");
          console.warn(
            "If this is not the UFO dataset, the download may fail or produce incorrect data."
          );
        }
      }

      if (!response.rows || response.rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const rowData of response.rows) {
        try {
          const record = rowData.row;

          // Log first record structure for debugging
          if (!firstRecordLogged) {
            console.log(
              "First record structure:",
              JSON.stringify(record, null, 2)
            );
            console.log("Available fields:", Object.keys(record).join(", "));
            firstRecordLogged = true;
          }

          // Require uid field - skip records without it
          // This is necessary for syncing to work properly
          if (!record.uid) {
            skippedNoUid++;
            // Only log first few to avoid spam
            if (skippedNoUid <= 5) {
              console.warn(
                `Skipping record without UID at offset ${offset} (row_idx: ${rowData.row_idx})`
              );
              if (skippedNoUid === 5) {
                console.warn(
                  `... (will continue skipping records without UID, summary at end)`
                );
              }
            }
            errors++;
            continue;
          }

          const safeUid = sanitizeUid(record.uid);
          const filePath = path.join(OUTPUT_DIR, `${safeUid}.json`);

          // Write each record as a separate JSON file
          await fs.writeFile(
            filePath,
            JSON.stringify(record, null, 2),
            "utf-8"
          );
          count++;

          if (count % 10000 === 0) {
            console.log(`Processed ${count} records...`);
          }
        } catch (error) {
          console.error(
            `Error saving record at offset ${offset}:`,
            error.message
          );
          errors++;
        }
      }

      // Check if there are more rows
      // The API returns truncated:true if there are more rows
      hasMore =
        response.truncated === true && response.rows.length === BATCH_SIZE;
      offset += response.rows.length;

      // Small delay to avoid rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching batch at offset ${offset}:`, error.message);
      errors++;
      // If we get an error, try to continue with next batch
      offset += BATCH_SIZE;
      // But limit retries to avoid infinite loops
      if (errors > 100) {
        throw new Error("Too many errors, stopping download");
      }
    }
  }

  if (skippedNoUid > 0) {
    console.log(
      `\nWarning: Skipped ${skippedNoUid} records that didn't have a 'uid' field`
    );
    console.log(
      `This may indicate the dataset structure is different than expected.`
    );
    console.log(
      `Check the first record structure logged above to verify the data format.`
    );
  }

  return { count, errors };
}

async function downloadDataset() {
  console.log("Starting dataset download...");
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Check which download method to use
  const useAPI = process.env.USE_API === "true";

  if (useAPI) {
    console.log("API method enabled (USE_API=true)");
  } else {
    console.log(
      "Snapshot download method (set USE_API=true in .env.local to use API method)"
    );
  }

  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Check if directory already has files
    const existingFiles = await fs.readdir(OUTPUT_DIR);
    const jsonFiles = existingFiles.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length > 0) {
      console.log(`Found ${jsonFiles.length} existing records.`);
      const answer = process.env.FORCE_DOWNLOAD === "true" ? "y" : null;
      if (!answer) {
        console.log(
          "To re-download, set FORCE_DOWNLOAD=true or delete the data/records directory first."
        );
        return;
      }
      console.log("Force download enabled, proceeding...");
    }

    let count = 0;
    let errors = 0;

    if (useAPI) {
      // Use API method
      const result = await downloadViaAPI();
      count = result.count;
      errors = result.errors;
    } else {
      // Use snapshot download method (original approach)
      console.log("Using snapshot download method...");
      console.log("(Set USE_API=true to use the API method instead)");

      // Download dataset from Hugging Face
      console.log("Downloading dataset from Hugging Face...");
      const token = process.env.HUGGINGFACE_TOKEN;
      const localDir = await snapshotDownload({
        repo: DATASET_NAME,
        repoType: "dataset",
        token: token || undefined,
      });

      console.log(`Dataset downloaded to: ${localDir}`);

      // Find JSONL files in the downloaded directory (recursively)
      console.log("Scanning for dataset files...");
      const jsonlFiles = await findFilesRecursive(localDir, ".jsonl");

      if (jsonlFiles.length === 0) {
        // Also check for .json files (some datasets use .json instead of .jsonl)
        const jsonFiles = await findFilesRecursive(localDir, ".json");

        if (jsonFiles.length === 0) {
          // List some files for debugging
          try {
            const topLevelFiles = await fs.readdir(localDir);
            throw new Error(
              `No JSONL or JSON files found in downloaded directory: ${localDir}\n` +
                `Top-level files: ${topLevelFiles.slice(0, 10).join(", ")}${
                  topLevelFiles.length > 10 ? "..." : ""
                }`
            );
          } catch (error) {
            if (error.message.includes("No JSONL")) {
              throw error;
            }
            throw new Error(
              `No JSONL or JSON files found in downloaded directory: ${localDir}\n` +
                `Could not list directory contents: ${error.message}`
            );
          }
        }
        jsonlFiles.push(...jsonFiles);
      }

      console.log(`Found ${jsonlFiles.length} dataset file(s)`);

      console.log("Parsing and saving records as individual JSON files...");

      // Parse JSONL files and process records
      for (const jsonlFile of jsonlFiles) {
        console.log(`Processing ${path.basename(jsonlFile)}...`);
        const fileContent = await fs.readFile(jsonlFile, "utf-8");
        const lines = fileContent.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            // Parse JSON from each line
            const record = JSON.parse(line);

            if (!record.uid) {
              console.warn(`Skipping record without UID at index ${count}`);
              errors++;
              continue;
            }

            const safeUid = sanitizeUid(record.uid);
            const filePath = path.join(OUTPUT_DIR, `${safeUid}.json`);

            // Write each record as a separate JSON file
            await fs.writeFile(
              filePath,
              JSON.stringify(record, null, 2),
              "utf-8"
            );
            count++;

            if (count % 10000 === 0) {
              console.log(`Processed ${count} records...`);
            }
          } catch (error) {
            if (error instanceof SyntaxError) {
              console.warn(`Skipping invalid JSON line: ${error.message}`);
            } else {
              const recordUid = (() => {
                try {
                  const parsed = JSON.parse(line);
                  return parsed.uid || "unknown";
                } catch {
                  return "unknown";
                }
              })();
              console.error(`Error saving record ${recordUid}:`, error.message);
            }
            errors++;
          }
        }
      }
    }

    console.log(`\nDownload complete!`);
    console.log(`Total records processed: ${count}`);
    if (errors > 0) {
      console.log(`Errors encountered: ${errors}`);
    }

    // Get directory size
    const files = await fs.readdir(OUTPUT_DIR);
    const downloadedJsonFiles = files.filter((f) => f.endsWith(".json"));
    console.log(`Files created: ${downloadedJsonFiles.length}`);

    if (downloadedJsonFiles.length > 0) {
      // Calculate approximate size
      let totalSize = 0;
      const sampleSize = Math.min(100, downloadedJsonFiles.length);
      for (const file of downloadedJsonFiles.slice(0, sampleSize)) {
        try {
          const stats = await fs.stat(path.join(OUTPUT_DIR, file));
          totalSize += stats.size;
        } catch (error) {
          console.warn(`Could not stat file ${file}:`, error.message);
        }
      }
      if (sampleSize > 0) {
        const avgSize = totalSize / sampleSize;
        const estimatedSizeMB = (
          (avgSize * downloadedJsonFiles.length) /
          (1024 * 1024)
        ).toFixed(2);
        console.log(`Estimated total size: ${estimatedSizeMB} MB`);
      }
    } else {
      console.log("No files were created. Check for errors above.");
    }
  } catch (error) {
    console.error("Error downloading dataset:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  downloadDataset();
}

module.exports = { downloadDataset };
