const fs = require("fs").promises;
const path = require("path");
const { parse } = require("csv-parse/sync");

/**
 * Sanitize a value for use as filename
 */
function sanitizeFilename(value) {
  if (value === null || value === undefined) {
    return "unknown";
  }
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Parse CSV file and convert each row to individual JSON files
 */
async function parseCsvToJson(inputFile, outputDir, uidColumns, limit) {
  console.log("Starting CSV to JSON conversion...");
  console.log(`Input file: ${inputFile}`);
  console.log(`Output directory: ${outputDir}`);

  // Parse comma-separated column names
  const columnList = uidColumns.split(",").map((col) => col.trim());
  console.log(`UID columns: ${columnList.join(", ")}`);

  if (limit) {
    console.log(`Limit: ${limit} records`);
  }

  try {
    // Read the CSV file
    console.log("Reading CSV file...");
    const csvContent = await fs.readFile(inputFile, "utf-8");

    // Parse CSV
    console.log("Parsing CSV...");
    const records = parse(csvContent, {
      columns: true, // Use first line as column names (header is excluded from records)
      skip_empty_lines: true,
      trim: true,
    });

    // Note: records array does NOT include the header row
    const totalRecords = records.length;
    console.log(`Found ${totalRecords} data records (header excluded)`);

    // Get input filename without extension for prefix
    const inputBasename = path.basename(inputFile, path.extname(inputFile));
    console.log(`Using filename prefix: ${inputBasename}`);

    // Verify all UID columns exist
    if (records.length > 0) {
      const availableColumns = Object.keys(records[0]);
      const missingColumns = columnList.filter(
        (col) => !availableColumns.includes(col)
      );
      if (missingColumns.length > 0) {
        throw new Error(
          `UID column(s) "${missingColumns.join(
            ", "
          )}" not found in CSV. Available columns: ${availableColumns.join(
            ", "
          )}`
        );
      }
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Process each record
    let count = 0;
    let errors = 0;
    const seenUids = new Set();

    console.log("Converting records to JSON files...");

    // Apply limit if specified (header is already excluded from records array)
    const recordsToProcess = limit ? records.slice(0, limit) : records;
    if (limit && totalRecords > limit) {
      console.log(
        `Processing first ${limit} of ${totalRecords} data records (header excluded)`
      );
    }

    for (let i = 0; i < recordsToProcess.length; i++) {
      try {
        const record = recordsToProcess[i];

        // Get values from all specified columns, filtering out empty ones
        const uidValues = columnList
          .map((col) => {
            const val = record[col];
            return val !== null && val !== undefined && val !== "" ? val : null;
          })
          .filter((val) => val !== null);

        // Only skip if ALL columns are empty
        if (uidValues.length === 0) {
          console.warn(
            `Skipping record at line ${
              i + 2
            } (header is line 1): all UID columns are empty: ${columnList.join(
              ", "
            )}`
          );
          errors++;
          continue;
        }

        // Sanitize each part and join with underscores
        const safeUidParts = uidValues.map((val) => sanitizeFilename(val));
        const safeUid = safeUidParts.join("_");

        // Check for duplicates
        if (seenUids.has(safeUid)) {
          console.warn(
            `Duplicate UID "${safeUid}" at line ${i + 2}, appending timestamp`
          );
          // Append current timestamp to make it unique
          const timestamp = Date.now();
          const uniqueUid = `${safeUid}_${timestamp}`;
          seenUids.add(uniqueUid);
          var finalUid = uniqueUid;
        } else {
          seenUids.add(safeUid);
          var finalUid = safeUid;
        }

        // Create filename: {uid}_{inputBasename}.json
        const filename = `${finalUid}_${inputBasename}.json`;
        const filePath = path.join(outputDir, filename);

        // Write JSON file
        await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");
        count++;

        if (count % 1000 === 0) {
          console.log(`Processed ${count} records...`);
        }
      } catch (error) {
        console.error(
          `Error processing record at line ${i + 2}:`,
          error.message
        );
        errors++;
      }
    }

    console.log(`\nConversion complete!`);
    console.log(`Total records processed: ${count}`);
    console.log(`Files created: ${count}`);
    if (errors > 0) {
      console.log(`Errors: ${errors}`);
    }

    // Calculate directory size
    const files = await fs.readdir(outputDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    console.log(`Total JSON files in output directory: ${jsonFiles.length}`);

    if (jsonFiles.length > 0) {
      // Calculate approximate size
      let totalSize = 0;
      const sampleSize = Math.min(100, jsonFiles.length);
      for (const file of jsonFiles.slice(0, sampleSize)) {
        try {
          const stats = await fs.stat(path.join(outputDir, file));
          totalSize += stats.size;
        } catch (error) {
          console.warn(`Could not stat file ${file}:`, error.message);
        }
      }
      if (sampleSize > 0) {
        const avgSize = totalSize / sampleSize;
        const estimatedSizeMB = (
          (avgSize * jsonFiles.length) /
          (1024 * 1024)
        ).toFixed(2);
        console.log(`Estimated total size: ${estimatedSizeMB} MB`);
      }
    }
  } catch (error) {
    console.error("Error parsing CSV:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(
    "Usage: node parse-csv.js <input-file> <output-dir> <uid-columns> [limit]"
  );
  console.error("");
  console.error("Arguments:");
  console.error("  input-file   Path to the CSV file to parse");
  console.error("  output-dir   Directory where JSON files will be saved");
  console.error(
    "  uid-columns  Comma-separated list of CSV column names to use as UID"
  );
  console.error(
    "  limit        (Optional) Maximum number of records to process"
  );
  console.error("");
  console.error("Examples:");
  console.error('  node parse-csv.js complete.csv data/records "id"');
  console.error(
    '  node parse-csv.js complete.csv data/records "datetime,city,state"'
  );
  console.error(
    '  node parse-csv.js complete.csv data/records "datetime,city,state" 1000'
  );
  process.exit(1);
}

const [inputFile, outputDir, uidColumns, limitArg] = args;
const limit = limitArg ? parseInt(limitArg, 10) : null;

if (limitArg && (isNaN(limit) || limit <= 0)) {
  console.error(`Error: Limit must be a positive number, got "${limitArg}"`);
  process.exit(1);
}

// Resolve paths
const resolvedInputFile = path.isAbsolute(inputFile)
  ? inputFile
  : path.resolve(process.cwd(), inputFile);
const resolvedOutputDir = path.isAbsolute(outputDir)
  ? outputDir
  : path.resolve(process.cwd(), outputDir);

// Run the conversion
parseCsvToJson(resolvedInputFile, resolvedOutputDir, uidColumns, limit);

module.exports = { parseCsvToJson };
