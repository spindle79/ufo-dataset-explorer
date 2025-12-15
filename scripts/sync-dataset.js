// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

const { snapshotDownload } = require("@huggingface/hub");
const fs = require("fs").promises;
const path = require("path");

const DATASET_NAME = "cjc0013/Ufo_data_clustered";
const OUTPUT_DIR = path.join(process.cwd(), "data", "records");
const SYNC_LOG_FILE = path.join(process.cwd(), "data", ".sync-log.json");

/**
 * Sanitize UID for use as filename
 */
function sanitizeUid(uid) {
  return uid.replace(/\//g, "_");
}

/**
 * Load sync log (tracks which records we have)
 */
async function loadSyncLog() {
  try {
    const content = await fs.readFile(SYNC_LOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      lastSync: null,
      recordCount: 0,
      uids: new Set(),
    };
  }
}

/**
 * Save sync log
 */
async function saveSyncLog(log) {
  await fs.mkdir(path.dirname(SYNC_LOG_FILE), { recursive: true });
  await fs.writeFile(
    SYNC_LOG_FILE,
    JSON.stringify(
      {
        ...log,
        uids: Array.from(log.uids),
      },
      null,
      2
    ),
    "utf-8"
  );
}

/**
 * Get existing UIDs from filesystem
 */
async function getExistingUids() {
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    return new Set(jsonFiles.map((f) => f.replace(".json", "")));
  } catch {
    return new Set();
  }
}

async function syncDataset() {
  console.log("Starting dataset sync...");
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Load sync log
    const syncLog = await loadSyncLog();
    if (syncLog.uids && !Array.isArray(syncLog.uids)) {
      syncLog.uids = new Set(syncLog.uids);
    } else {
      syncLog.uids = new Set(syncLog.uids || []);
    }

    // Get existing files
    const existingUids = await getExistingUids();
    console.log(`Found ${existingUids.size} existing records in filesystem`);

    // Download dataset from Hugging Face
    console.log("Downloading dataset from Hugging Face...");
    const token = process.env.HUGGINGFACE_TOKEN;
    const localDir = await snapshotDownload({
      repo: DATASET_NAME,
      repoType: "dataset",
      token: token || undefined,
    });

    console.log(`Dataset downloaded to: ${localDir}`);
    console.log(
      "NOTE: @huggingface/hub v2 downloads files instead of providing an iterable."
    );
    console.log(
      "This script needs to be updated to parse the downloaded dataset files."
    );
    console.log(
      "Please check the dataset format (Parquet/Arrow/JSON) and implement parsing."
    );

    // TODO: Parse the downloaded dataset files and iterate over records
    // For now, this is a placeholder
    throw new Error(
      "Dataset parsing not yet implemented. Please update this script to parse the downloaded files from: " +
        localDir
    );

    console.log("Syncing records...");
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errors = 0;

    // This code needs to be updated to parse files from localDir instead
    for await (const record of []) {
      try {
        if (!record.uid) {
          console.warn(`Skipping record without UID`);
          errors++;
          continue;
        }

        const safeUid = sanitizeUid(record.uid);
        const filePath = path.join(OUTPUT_DIR, `${safeUid}.json`);
        const exists = existingUids.has(safeUid);

        if (exists) {
          // Check if file needs updating (compare content)
          try {
            const existingContent = await fs.readFile(filePath, "utf-8");
            const existingRecord = JSON.parse(existingContent);

            // Simple comparison - update if different
            if (JSON.stringify(existingRecord) !== JSON.stringify(record)) {
              await fs.writeFile(
                filePath,
                JSON.stringify(record, null, 2),
                "utf-8"
              );
              updatedCount++;
            } else {
              skippedCount++;
            }
          } catch {
            // File exists but couldn't read it, rewrite it
            await fs.writeFile(
              filePath,
              JSON.stringify(record, null, 2),
              "utf-8"
            );
            updatedCount++;
          }
        } else {
          // New record
          await fs.writeFile(
            filePath,
            JSON.stringify(record, null, 2),
            "utf-8"
          );
          newCount++;
        }

        syncLog.uids.add(safeUid);

        const total = newCount + updatedCount + skippedCount;
        if (total % 10000 === 0) {
          console.log(
            `Processed ${total} records (${newCount} new, ${updatedCount} updated, ${skippedCount} skipped)...`
          );
        }
      } catch (error) {
        console.error(`Error processing record ${record.uid}:`, error.message);
        errors++;
      }
    }

    // Update sync log
    syncLog.lastSync = new Date().toISOString();
    syncLog.recordCount = syncLog.uids.size;

    await saveSyncLog(syncLog);

    console.log(`\nSync complete!`);
    console.log(`New records: ${newCount}`);
    console.log(`Updated records: ${updatedCount}`);
    console.log(`Skipped records: ${skippedCount}`);
    console.log(`Total records: ${syncLog.recordCount}`);
    if (errors > 0) {
      console.log(`Errors: ${errors}`);
    }
    console.log(`Last sync: ${syncLog.lastSync}`);
  } catch (error) {
    console.error("Error syncing dataset:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncDataset();
}

module.exports = { syncDataset };
