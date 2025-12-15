#!/usr/bin/env node

/**
 * Download NUFORC Database to CSV
 *
 * This script downloads the NUFORC (National UFO Reporting Center) database
 * using the uDb integration and exports it to a CSV file.
 *
 * Usage:
 *   npm run download-nuforc-csv
 *   npm run download-nuforc-csv -- --output data/nuforc/nuforc_reports.csv
 *   npm run download-nuforc-csv -- --year 2020
 *   npm run download-nuforc-csv -- --max-records 5000
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");

const execAsync = promisify(exec);

// Default configuration
const DEFAULT_OUTPUT = path.join(
  process.cwd(),
  "data",
  "nuforc",
  "nuforc_reports.csv"
);
const DEFAULT_MAX_RECORDS = 10000; // Reasonable default
const BATCH_SIZE = 1000; // uDb maxCount limit is 1000

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    output: DEFAULT_OUTPUT,
    maxRecords: DEFAULT_MAX_RECORDS,
    year: null,
    match: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--output" || arg === "-o") {
      config.output = args[++i];
    } else if (arg === "--max-records" || arg === "-m") {
      config.maxRecords = parseInt(args[++i], 10);
    } else if (arg === "--year" || arg === "-y") {
      config.year = args[++i];
      config.match = `year=${config.year}`;
    } else if (arg === "--match" || arg === "-m") {
      config.match = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Download NUFORC Database to CSV

Usage:
  npm run download-nuforc-csv [options]

Options:
  --output, -o <path>     Output CSV file path (default: data/nuforc/nuforc_reports.csv)
  --max-records, -m <num>  Maximum number of records to download (default: 10000)
  --year, -y <year>        Filter by year (e.g., 2020)
  --match <criteria>       Custom match criteria (e.g., "year=2020&month=8")
  --help, -h               Show this help message

Examples:
  npm run download-nuforc-csv
  npm run download-nuforc-csv -- --output data/nuforc/2020.csv --year 2020
  npm run download-nuforc-csv -- --max-records 5000
      `);
      process.exit(0);
    }
  }

  return config;
}

/**
 * Execute uDb CLI command and return CSV output
 */
async function queryUDbCSV(match, firstIndex, maxCount) {
  const os = require("os");
  const tmpFile = path.join(
    os.tmpdir(),
    `nuforc-batch-${Date.now()}-${Math.random().toString(36).substring(7)}.csv`
  );

  const args = [];

  // Database type
  args.push("--database", "nuforc");

  // Match criteria
  if (match) {
    args.push("--match", match);
  }

  // Count
  args.push("--count", Math.min(maxCount, BATCH_SIZE).toString());

  // Format - CSV
  args.push("--format", "csv");

  // Output to temp file
  args.push("--out", tmpFile);

  // Build command
  const cmd = `npx -y @rr0/udb ${args.map((arg) => `"${arg}"`).join(" ")}`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
      shell: true,
    });

    if (stderr && !stderr.includes("warning") && !stderr.includes("npm")) {
      console.warn("uDb stderr:", stderr);
    }

    // Read the CSV file
    let csvContent;
    try {
      csvContent = await fs.readFile(tmpFile, "utf-8");
    } catch (readError) {
      // If file doesn't exist, try stdout
      if (stdout && stdout.trim().length > 0) {
        csvContent = stdout;
      } else {
        throw new Error(`Failed to read CSV output file: ${readError.message}`);
      }
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
    }

    return csvContent;
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tmpFile);
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(
      `Failed to execute uDb CLI: ${error.message}\n` + `Command: ${cmd}`
    );
  }
}

/**
 * Parse CSV and extract header and rows
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) {
    return { header: null, rows: [] };
  }

  const header = lines[0];
  const rows = lines.slice(1).filter((line) => line.trim().length > 0);

  return { header, rows };
}

/**
 * Download NUFORC database in batches
 */
async function downloadNUFORC(config) {
  const { output, maxRecords, match } = config;

  console.log("Downloading NUFORC Database to CSV");
  console.log("===================================\n");
  console.log(`Output file: ${output}`);
  console.log(`Max records: ${maxRecords}`);
  if (match) {
    console.log(`Match criteria: ${match}`);
  }
  console.log();

  // Create output directory if it doesn't exist
  const outputDir = path.dirname(output);
  await fs.mkdir(outputDir, { recursive: true });

  let allRows = [];
  let header = null;
  let totalDownloaded = 0;
  let batchNumber = 1;
  const totalBatches = Math.ceil(maxRecords / BATCH_SIZE);

  console.log(`Downloading in batches of ${BATCH_SIZE} records...`);
  console.log(`Total batches: ${totalBatches}\n`);

  try {
    while (totalDownloaded < maxRecords) {
      const remaining = maxRecords - totalDownloaded;
      const batchSize = Math.min(BATCH_SIZE, remaining);
      const firstIndex = totalDownloaded + 1;

      const endIndex = firstIndex + batchSize - 1;
      process.stdout.write(
        `Batch ${batchNumber}/${totalBatches}: Downloading records ${firstIndex}-${endIndex}... `
      );

      try {
        const csvOutput = await queryUDbCSV(match, firstIndex, batchSize);
        const { header: batchHeader, rows: batchRows } = parseCSV(csvOutput);

        if (!header && batchHeader) {
          header = batchHeader;
        }

        if (batchRows.length === 0) {
          console.log("No more records available.");
          break;
        }

        allRows.push(...batchRows);
        totalDownloaded += batchRows.length;

        console.log(
          `✓ ${batchRows.length} records (Total: ${totalDownloaded})`
        );

        // If we got fewer records than requested, we've reached the end
        if (batchRows.length < batchSize) {
          console.log("  Reached end of database.");
          break;
        }
      } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        // If it's the first batch and it fails, throw the error
        if (batchNumber === 1) {
          throw error;
        }
        // Otherwise, log and continue (might be rate limiting or network issue)
        console.warn(`  Continuing with next batch...`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait longer before retry
        continue;
      }

      batchNumber++;

      // Small delay to avoid overwhelming the server
      if (totalDownloaded < maxRecords) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Write CSV file
    console.log(`\nWriting CSV file...`);
    const csvContent = [header, ...allRows].join("\n") + "\n";
    await fs.writeFile(output, csvContent, "utf-8");

    const fileSize = (csvContent.length / (1024 * 1024)).toFixed(2);
    console.log(`✓ Successfully downloaded ${totalDownloaded} records`);
    console.log(`✓ File saved: ${output}`);
    console.log(`✓ File size: ${fileSize} MB`);
    console.log();

    return {
      records: totalDownloaded,
      file: output,
      size: csvContent.length,
    };
  } catch (error) {
    console.error("\n❌ Error downloading NUFORC database:", error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const config = parseArgs();
    await downloadNUFORC(config);
    console.log("Download complete!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { downloadNUFORC, parseArgs };

