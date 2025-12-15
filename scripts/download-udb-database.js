#!/usr/bin/env node

/**
 * Download/Setup Script for uDb (Larry Hatch UFO Database)
 *
 * This script helps set up the uDb database file (U.RND) for use with the uDb integration.
 *
 * Note: The U.RND file is not directly downloadable from the uDb repository.
 * You need to obtain it from other sources or use the NUFORC web database instead.
 */

const fs = require("fs").promises;
const path = require("path");

const projectRoot = process.cwd();

const DEFAULT_DB_PATH = path.join(
  projectRoot,
  "input",
  "db",
  "udb",
  "data",
  "U.RND"
);
const DB_DIR = path.dirname(DEFAULT_DB_PATH);

async function checkDatabaseExists(dbPath) {
  try {
    await fs.access(dbPath);
    const stats = await fs.stat(dbPath);
    return {
      exists: true,
      size: stats.size,
      path: dbPath,
    };
  } catch {
    return {
      exists: false,
      path: dbPath,
    };
  }
}

async function createDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}

async function main() {
  console.log("uDb Database Setup");
  console.log("==================\n");

  // Check if database exists in package first
  const packageDbPath = path.join(
    projectRoot,
    "node_modules",
    "@rr0",
    "udb",
    "data",
    "udb",
    "input",
    "U.RND"
  );

  const packageDbInfo = await checkDatabaseExists(packageDbPath);

  if (packageDbInfo.exists) {
    const sizeMB = (packageDbInfo.size / (1024 * 1024)).toFixed(2);
    console.log(`✓ Database file found in @rr0/udb package:`);
    console.log(`  Path: ${packageDbInfo.path}`);
    console.log(`  Size: ${sizeMB} MB\n`);
    console.log("The database is ready to use!");
    console.log("You can query it using:");
    console.log("  - API: GET /api/udb?match=year=1972&maxCount=10");
    console.log("  - Code: queryUDb({ database: 'udb', ... })\n");
    return;
  }

  // Check if database already exists in custom location
  const dbInfo = await checkDatabaseExists(DEFAULT_DB_PATH);

  if (dbInfo.exists) {
    const sizeMB = (dbInfo.size / (1024 * 1024)).toFixed(2);
    console.log(`✓ Database file already exists:`);
    console.log(`  Path: ${dbInfo.path}`);
    console.log(`  Size: ${sizeMB} MB\n`);
    console.log("The database is ready to use!");
    return;
  }

  // Create directory structure
  console.log("Creating directory structure...");
  await createDirectory(DB_DIR);
  console.log();

  // Provide instructions
  console.log("⚠️  Database file (U.RND) not found.\n");
  console.log(
    "The U.RND file is not directly downloadable from the uDb repository."
  );
  console.log("Here are your options:\n");

  console.log("Option 1: Use NUFORC Web Database (Recommended for testing)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(
    "You can use the NUFORC web database without downloading anything:"
  );
  console.log("  GET /api/udb?database=nuforc&match=year=2020&maxCount=10");
  console.log("  Or in code: queryUDb({ database: 'nuforc', ... })\n");

  console.log("Option 2: Obtain U.RND File from Alternative Sources");
  console.log("───────────────────────────────────────────────────────");
  console.log("The U.RND file can be obtained from:");
  console.log(
    "  1. Historical archives or repositories that have preserved the file"
  );
  console.log("  2. The uDb project's data directory (if you have access)");
  console.log("  3. Community resources that have made the database available");
  console.log("\nOnce you have the U.RND file:");
  console.log(`  1. Place it at: ${DEFAULT_DB_PATH}`);
  console.log(
    "  2. Or set UDB_DATABASE_PATH in .env.local to your custom path"
  );
  console.log(
    "  3. The file is large (typically 10-50 MB) and should be in .gitignore\n"
  );

  console.log("Option 3: Check uDb Repository for Data Files");
  console.log("───────────────────────────────────────────────");
  console.log("The uDb repository may include sample data or instructions:");
  console.log("  https://github.com/RR0/uDb");
  console.log("  Check the 'data' or 'input' directories in the repository\n");

  console.log("Option 4: Use Converted/Alternative Formats");
  console.log("─────────────────────────────────────────────");
  console.log(
    "Some repositories have converted the database to other formats:"
  );
  console.log("  - GitHub: richgel999/ufo_data (decoded Hatch database)");
  console.log("  - These may require conversion back to .RND format\n");

  console.log("Next Steps:");
  console.log("───────────");
  console.log("1. If you have the U.RND file, place it at the path above");
  console.log("2. If not, use the NUFORC database for now (database='nuforc')");
  console.log(
    "3. Test the integration: GET /api/udb?database=nuforc&maxCount=5"
  );
  console.log();

  // Create a placeholder README in the directory
  const readmePath = path.join(DB_DIR, "README.md");
  const readmeContent = `# uDb Database Directory

This directory should contain the U.RND database file for the Larry Hatch UFO database.

## File Location

Place the U.RND file here:
\`\`\`
${DEFAULT_DB_PATH}
\`\`\`

## Alternative: Use NUFORC Database

If you don't have the U.RND file, you can use the NUFORC web database instead:

\`\`\`typescript
import { queryUDb } from '@/app/lib/udb';

const result = await queryUDb({
  database: 'nuforc',
  match: 'year=2020',
  maxCount: 10
});
\`\`\`

Or via API:
\`\`\`
GET /api/udb?database=nuforc&match=year=2020&maxCount=10
\`\`\`

## Obtaining the U.RND File

The U.RND file is not directly downloadable. You may need to:
1. Check the uDb repository for data files: https://github.com/RR0/uDb
2. Look for community resources that have preserved the database
3. Check historical archives or repositories

## File Size

The U.RND file is typically 10-50 MB in size. Make sure it's added to .gitignore.
`;

  try {
    await fs.writeFile(readmePath, readmeContent, "utf-8");
    console.log(`✓ Created README at: ${readmePath}`);
  } catch (error) {
    console.warn(`⚠ Could not create README: ${error.message}`);
  }

  console.log("\nSetup complete! See the instructions above for next steps.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

