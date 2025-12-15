# Dataset Access Guide

This guide explains how to access and work with the UFO sightings dataset in this project.

## Dataset Overview

The dataset used in this project is the [UFO Sightings – Cleaned & Unified Dataset](https://huggingface.co/datasets/cjc0013/Ufo_data_clustered) from Hugging Face.

- **Source**: Multiple publicly available Kaggle datasets
- **Records**: ~327,000 UFO sighting reports
- **Format**: JSONL (JSON Lines)
- **License**: MIT (research and educational use)

## Dataset Schema

Each record contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Stable row identifier |
| `t_utc` | string | Event timestamp, ISO-8601 UTC |
| `lat` | float | Latitude coordinate |
| `lon` | float | Longitude coordinate |
| `city` | string | City name (cleaned) |
| `state` | string | State/province code |
| `country` | string | Country code |
| `text` | string | Free-text sighting description |
| `src` | string | Original Kaggle dataset source |
| `cluster_id` | int | Text-similarity cluster ID |
| `prob` | float | Cluster membership probability |
| `moon_illum` | float | Moon illumination (0–1) |
| `moon_alt_deg` | float | Moon altitude in degrees |
| `nearest_airport_km` | float | Distance to nearest airport (km) |
| `nearest_airport_code` | string | ICAO airport code |
| `wx_bucket` | string | Approximate weather category |
| `reports_z` | float/null | Placeholder field |

## Access Methods

This project supports two methods for accessing the dataset:

### 1. Local Filesystem Access (Recommended for Production)

Download the dataset locally and store each record as an individual JSON file. This provides the best performance and allows for easy migration to a database later.

#### Download Script

Run the download script to download and split the dataset:

```bash
npm run download-dataset
```

This will:
1. Download the dataset from Hugging Face
2. Split each record into individual JSON files
3. Save files to `data/records/` directory
4. Each file is named using the record's UID (sanitized for filesystem)

#### Sync Script

To keep your local dataset up-to-date, use the sync script:

```bash
npm run sync-dataset
```

This will:
1. Check for new or updated records
2. Only download/update changed records
3. Maintain a sync log for tracking

#### File Structure

```
data/
├── records/
│   ├── scrubbed_row327047.json
│   ├── scrubbed_row327048.json
│   └── ...
└── .sync-log.json
```

#### Advantages
- Fast access (no API calls)
- Works offline
- Easy to migrate to database (just swap the data access layer)
- Individual files allow for efficient querying
- No API rate limits

#### Limitations
- Requires local storage (~100MB+)
- Must manually sync to get updates
- Not suitable for serverless deployments without external storage

### 2. Hugging Face API Access (Fallback)

If local files are not available, the system automatically falls back to the Hugging Face API.

#### Setup

1. Get a Hugging Face token (optional, but recommended):
   - Go to https://huggingface.co/settings/tokens
   - Create a new token
   - Add it to `.env.local`:
     ```
     HUGGINGFACE_TOKEN=your_token_here
     ```

2. The dataset will be accessed via the `@huggingface/datasets` library.

#### Usage

The API automatically falls back to Hugging Face if local files aren't available:

```typescript
import { queryDataset } from '@/lib/dataset';

// Automatically uses filesystem if available, otherwise Hugging Face API
const result = await queryDataset({ limit: 10 });
```

#### Advantages
- No local storage required
- Always up-to-date
- Easy to use in serverless environments
- Automatic fallback

#### Limitations
- Requires internet connection
- API rate limits may apply
- Slower for very large queries

#### Advantages
- Faster access for large queries
- Works offline
- No API rate limits
- Better for bulk operations

#### Limitations
- Requires local storage (~100MB+)
- Must manually update to get latest data
- Not suitable for serverless deployments

## Access Patterns

### Basic Query

```typescript
// Get first 10 records
const records = await queryDataset({
  limit: 10,
  offset: 0
});
```

### Filtering

```typescript
// Filter by state
const records = await queryDataset({
  filters: {
    state: 'CA'
  },
  limit: 50
});

// Filter by date range
const records = await queryDataset({
  filters: {
    dateFrom: '2020-01-01',
    dateTo: '2020-12-31'
  }
});

// Filter by location (bounding box)
const records = await queryDataset({
  filters: {
    latMin: 32.0,
    latMax: 35.0,
    lonMin: -120.0,
    lonMax: -117.0
  }
});
```

### Text Search

```typescript
// Search in text field
const records = await queryDataset({
  search: 'lights',
  limit: 20
});
```

### Sorting

```typescript
// Sort by date
const records = await queryDataset({
  sortBy: 't_utc',
  sortOrder: 'desc',
  limit: 100
});
```

## Performance Considerations

### Pagination

Always use pagination for large result sets:

```typescript
const records = await queryDataset({
  limit: 100,
  offset: 0
});
```

### Streaming

For very large queries, use streaming:

```typescript
import { streamDataset } from '@/lib/dataset';

for await (const record of streamDataset({ filters: { state: 'CA' } })) {
  // Process each record
}
```

### Caching

The dataset metadata and frequently accessed data are cached automatically. Cache keys are based on query parameters.

## Error Handling

Always handle errors when accessing the dataset:

```typescript
try {
  const records = await queryDataset({ limit: 10 });
} catch (error) {
  if (error instanceof DatasetNotFoundError) {
    // Handle missing dataset
  } else if (error instanceof APIError) {
    // Handle API errors
  } else {
    // Handle other errors
  }
}
```

## Examples

See the API endpoints in `app/api/dataset/` for complete examples of dataset access patterns.

## Troubleshooting

### Dataset Not Found

If you get a "dataset not found" error:
1. Verify the dataset name: `cjc0013/Ufo_data_clustered`
2. Check your internet connection (for API access)
3. Verify local files exist (for local access): `data/records/` directory should contain JSON files
4. Run `npm run download-dataset` to download the dataset

### Slow Queries

If queries are slow:
1. Use pagination to limit result sets
2. Add appropriate filters
3. Ensure local files are downloaded (`npm run download-dataset`)
4. Check network connection (only needed if using API fallback)

### Memory Issues

For very large queries:
1. Use streaming instead of loading all at once
2. Process records in batches
3. Increase server memory if needed

## Additional Resources

- [Hugging Face Datasets Documentation](https://huggingface.co/docs/datasets/)
- [Dataset Card](https://huggingface.co/datasets/cjc0013/Ufo_data_clustered)
- [API Reference](./api-reference.md)

