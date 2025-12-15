# uDb Integration Guide

This guide explains how to use the uDb (Larry Hatch UFO Database) integration in this project.

## Overview

The uDb integration allows you to query the **\*U\* UFO database** (also known as the Larry Hatch database), which is a different dataset from the Hugging Face dataset used elsewhere in this project. The uDb database contains historical UFO sighting records in a binary format (.RND files) that can be read using the `@rr0/udb` package.

## What is uDb?

The uDb project is a Node.js application that reads binary data files from the \*U\* UFO database. This database was originally created by Larry Hatch and contains thousands of UFO sighting records with detailed metadata including:

- Historical sightings (dating back to ancient times)
- Geographic coordinates
- Credibility and strangeness ratings
- Detailed descriptions
- References and sources
- UFO craft types
- Occupant information

**Note**: The uDb database is separate from the Hugging Face dataset. The Hugging Face dataset contains modern sightings (primarily from Kaggle), while uDb contains historical and curated records from Larry Hatch's database.

## Installation

The `@rr0/udb` package is already installed as a dependency.

**Good News:** The `@rr0/udb` package includes a sample U.RND database file! It's automatically available at:
- `node_modules/@rr0/udb/data/udb/input/U.RND`

The integration will automatically use this database if no custom path is specified.

**Quick Start (No Database File Needed):**
- You can use the NUFORC web database immediately without any setup
- Just use `database: 'nuforc'` in your queries

**For Local U.RND Database:**
- Run `npm run setup-udb` to check if you have the database file
- If not, see "Obtaining the Database" section below

## Database Sources

The integration supports two database sources:

### 1. UDB Database (Local .RND file)

The traditional Larry Hatch database stored as a binary .RND file.

**Setup:**
1. Run the setup script to check database availability:
   ```bash
   npm run setup-udb
   # or
   pnpm run setup-udb
   ```

2. **Using the included database (default):**
   - No setup needed! The database from the package is used automatically
   - Just start querying: `GET /api/udb?match=year=1972&maxCount=10`

3. **Using a custom database file:**
   - Place your U.RND file in `./input/db/udb/data/U.RND` (or specify a custom path)
   - Or set `UDB_DATABASE_PATH` in `.env.local` to your custom path
   - The file is large (typically 10-50 MB) and is automatically added to `.gitignore`

**Default paths (checked in order):**
1. `UDB_DATABASE_PATH` environment variable
2. `node_modules/@rr0/udb/data/udb/input/U.RND` (package database)
3. `./input/db/udb/data/U.RND` (custom project path)

**Obtaining the U.RND File:**

The U.RND file is **not directly downloadable** from the uDb GitHub repository. Here are your options:

- **Option A: Use NUFORC Database** (Recommended if you don't have U.RND)
  - No download needed - it's web-based
  - Use `database: 'nuforc'` in your queries
  - See Option 2 below

- **Option B: Check Alternative Sources**
  - The uDb repository may have data files in the `data/` or `input/` directories
  - Community repositories may have preserved the database file
  - Historical archives or research repositories

- **Option C: Converted Formats**
  - Some repositories have decoded/converted versions (e.g., `richgel999/ufo_data` on GitHub)
  - These may require conversion back to .RND format

### 2. NUFORC Database (Web-based)

The National UFO Reporting Center database, accessible via web API.

**No setup required** - this is automatically available via web access.

## Usage

### Programmatic API

You can use the uDb wrapper directly in your code:

```typescript
import { queryUDb, getUDbRecordById } from '@/app/lib/udb';

// Query with match criteria
const result = await queryUDb({
  database: 'udb',
  match: 'year=1972&month=8&day=12',
  maxCount: 10,
  format: 'json'
});

console.log(result.records);
console.log(result.count);

// Get a single record by ID
const record = await getUDbRecordById(256, {
  database: 'udb'
});
```

### REST API

The integration provides REST API endpoints at `/api/udb`:

#### GET /api/udb

Query the database with URL parameters:

```bash
# Query by match criteria
GET /api/udb?match=year=1972&month=8&maxCount=10

# Get a single record by ID
GET /api/udb?id=256

# Use NUFORC database
GET /api/udb?database=nuforc&match=year=2020&maxCount=50

# Custom database path
GET /api/udb?source=/path/to/U.RND&match=year=1972
```

**Query Parameters:**

- `database`: `'udb'` or `'nuforc'` (default: `'udb'`)
- `source`: Path to U.RND file (optional, defaults to `./input/db/udb/data/U.RND`)
- `match`: Match criteria in format `"field=value&field=value"` or `"field=value|field=value"`
  - Use `&` for AND conditions
  - Use `|` for OR conditions
  - Examples:
    - `"year=1972&month=8&day=12"` - Records from August 12, 1972
    - `"id=256|id=12"` - Records with ID 256 or 12
- `maxCount`: Maximum number of records (default: 100, max: 1000)
- `firstIndex`: Starting record index, 1-based (default: 1)
- `format`: Output format - `'json'`, `'csv'`, `'xml'`, `'default'` (default: `'json'`)
- `allowEmpty`: Allow empty results (default: `false`)
- `id`: Get a single record by ID (alternative to match)

#### POST /api/udb

Query the database with a JSON body:

```bash
POST /api/udb
Content-Type: application/json

{
  "database": "udb",
  "match": "year=1972&month=8",
  "maxCount": 10,
  "format": "json"
}
```

## Downloading NUFORC Database to CSV

A script is provided to download the entire NUFORC database (or filtered subsets) to a CSV file:

```bash
# Download all records (up to 10,000 by default)
npm run download-nuforc-csv

# Download to a specific file
npm run download-nuforc-csv -- --output data/nuforc/nuforc_reports.csv

# Download records from a specific year
npm run download-nuforc-csv -- --year 2020

# Download with custom match criteria
npm run download-nuforc-csv -- --match "year=2020&month=8"

# Limit the number of records
npm run download-nuforc-csv -- --max-records 5000
```

The script:
- Downloads records in batches of 1000 (uDb's max limit)
- Handles pagination automatically
- Saves to CSV format
- Shows progress during download

**Output location:** `data/nuforc/nuforc_reports.csv` (default)

## CLI Usage

You can use the uDb CLI directly via the wrapper script:

```bash
# Get help
pnpm udb --help

# Query 10 records with verbose output
pnpm udb -c 10 --verbose

# Query with match criteria
pnpm udb -c 20 --match "year=1972&month=8"

# Export to CSV (now works correctly!)
pnpm udb -c 100 --format csv --out data/larryhatch/export.csv

# Use NUFORC database
pnpm udb --database nuforc -c 10
```

**Note:** The CSV format bug has been fixed in the local installation. The `--format csv` option now works correctly.

## Match Criteria Syntax

The match criteria use a simple query syntax:

### Field Names

Common field names include:
- `id` - Record ID
- `year` - Year of sighting
- `month` - Month (1-12)
- `day` - Day of month
- `time` - Time of sighting
- `location` - Location name
- `stateOrProvince` - State or province
- `country` - Country
- `latitude` - Latitude coordinate
- `longitude` - Longitude coordinate
- `credibility` - Credibility rating
- `strangeness` - Strangeness rating
- And many more...

### Operators

- `&` - AND (all conditions must match)
- `|` - OR (any condition can match)

### Examples

```typescript
// Records from August 12, 1972
"year=1972&month=8&day=12"

// Records with ID 256 or 12
"id=256|id=12"

// Records from 1972 in France
"year=1972&country=France"

// High credibility records
"credibility>=6"
```

## Response Format

### JSON Response

```json
{
  "records": [
    {
      "id": 1,
      "year": 1972,
      "month": 8,
      "day": 12,
      "location": "Location Name",
      "title": "Sighting Title",
      "description": "Sighting description...",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "credibility": 6,
      "strangeness": 7,
      // ... more fields
    }
  ],
  "count": 1,
  "format": "json",
  "query": {
    "database": "udb",
    "match": "year=1972&month=8&day=12",
    "maxCount": 10
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Invalid parameters
- `404` - Record not found (when querying by ID)
- `500` - Internal server error
- `503` - Database not available

## Integration with Existing Code

The uDb integration is separate from the Hugging Face dataset integration. You can use both in the same application:

```typescript
// Query Hugging Face dataset
import { queryDataset } from '@/app/lib/dataset';
const hfResults = await queryDataset({ limit: 10 });

// Query uDb database
import { queryUDb } from '@/app/lib/udb';
const udbResults = await queryUDb({ match: 'year=1972', maxCount: 10 });
```

## Environment Variables

You can configure the default database path using environment variables:

```bash
# .env.local
UDB_DATABASE_PATH=./input/db/udb/data/U.RND
```

## Limitations

1. **JSON format only in wrapper**: Currently, only JSON format is fully supported in the programmatic wrapper. CSV and XML formats work via CLI but require calling the CLI directly.

2. **Database file required**: For the 'udb' database type, you need to have the U.RND file available locally (or use the one in the package).

3. **Performance**: Large queries may take time. Use `maxCount` to limit results.

## Resources

- [uDb GitHub Repository](https://github.com/RR0/uDb)
- [uDb Documentation](https://github.com/RR0/uDb#readme)
- [Larry Hatch Database Information](https://rr0.org/udb)

## Troubleshooting

### Database file not found

If you get a "Database not available" error:

1. Check that the U.RND file exists at the specified path
2. Verify file permissions
3. Check the `UDB_DATABASE_PATH` environment variable
4. Ensure the path is correct (relative to project root)
5. The package includes a database at `node_modules/@rr0/udb/data/udb/input/U.RND` - this should be used automatically

### No results returned

- Check your match criteria syntax
- Verify that records matching your criteria exist
- Try a simpler query first (e.g., `match=year=1972`)
- Set `allowEmpty=true` to see if the query executes successfully

### CSV format not working

The CSV format bug has been fixed in the local installation. If you still have issues:

1. Make sure you're using the patched version (the fix is in `node_modules/@rr0/udb/bin/index.ts`)
2. If you reinstall packages, you may need to reapply the fix
3. The fix allows "csv" format to be passed through even though it's not in the Format enum

### Type errors

If you encounter TypeScript errors:

1. Ensure `@rr0/udb` is installed: `pnpm add @rr0/udb`
2. Check that TypeScript can find the type definitions
3. Restart your TypeScript server in your IDE

