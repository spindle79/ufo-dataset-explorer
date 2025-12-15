# API Reference

This document describes all API endpoints available in the UFO Dataset Explorer.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Currently, no authentication is required. Future versions may add API keys or OAuth.

## Endpoints

### GET /api/dataset

Query the UFO sightings dataset with filtering, pagination, and sorting.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of records to return (default: 50, max: 1000) |
| `offset` | number | No | Number of records to skip (default: 0) |
| `state` | string | No | Filter by state code (e.g., "CA") |
| `country` | string | No | Filter by country code (e.g., "US") |
| `dateFrom` | string | No | Start date (ISO-8601 format) |
| `dateTo` | string | No | End date (ISO-8601 format) |
| `latMin` | number | No | Minimum latitude |
| `latMax` | number | No | Maximum latitude |
| `lonMin` | number | No | Minimum longitude |
| `lonMax` | number | No | Maximum longitude |
| `clusterId` | number | No | Filter by cluster ID |
| `sortBy` | string | No | Field to sort by (default: "t_utc") |
| `sortOrder` | string | No | Sort order: "asc" or "desc" (default: "desc") |

#### Example Request

```bash
GET /api/dataset?limit=10&state=CA&sortBy=t_utc&sortOrder=desc
```

#### Response

```json
{
  "data": [
    {
      "uid": "scrubbed/row327047",
      "t_utc": "2013-09-09T09:51:00.000Z",
      "lat": 32.7152778,
      "lon": -117.1563889,
      "text": "2 white lights zig-zag over Qualcomm Stadium...",
      "src": "scrubbed",
      "city": "san diego",
      "state": "ca",
      "country": "US",
      "cluster_id": 725,
      "prob": 1.0,
      "moon_illum": 0.163603127,
      "moon_alt_deg": -67.0003509521,
      "nearest_airport_km": 3.7174715996,
      "nearest_airport_code": "KSAN",
      "reports_z": null,
      "wx_bucket": "unknown"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 327000,
    "hasMore": true
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid parameter",
  "message": "limit must be between 1 and 1000"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Failed to query dataset"
}
```

---

### POST /api/dataset/search

Search the dataset with full-text search and advanced filtering.

#### Request Body

```json
{
  "query": "lights",
  "filters": {
    "state": "CA",
    "dateFrom": "2020-01-01",
    "dateTo": "2020-12-31"
  },
  "limit": 20,
  "offset": 0,
  "sortBy": "t_utc",
  "sortOrder": "desc"
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | No | Full-text search query |
| `filters` | object | No | Filter criteria (same as GET parameters) |
| `limit` | number | No | Number of records to return |
| `offset` | number | No | Number of records to skip |
| `sortBy` | string | No | Field to sort by |
| `sortOrder` | string | No | Sort order: "asc" or "desc" |

#### Example Request

```bash
POST /api/dataset/search
Content-Type: application/json

{
  "query": "flying saucer",
  "filters": {
    "state": "NV",
    "latMin": 36.0,
    "latMax": 37.0
  },
  "limit": 50
}
```

#### Response

Same format as GET /api/dataset

#### Error Responses

Same as GET /api/dataset

---

### GET /api/dataset/stats

Get statistics about the dataset.

#### Example Request

```bash
GET /api/dataset/stats
```

#### Response

```json
{
  "totalRecords": 327000,
  "dateRange": {
    "earliest": "1906-01-01T00:00:00.000Z",
    "latest": "2023-12-31T23:59:59.000Z"
  },
  "geographicBounds": {
    "latMin": -90,
    "latMax": 90,
    "lonMin": -180,
    "lonMax": 180
  },
  "topStates": [
    { "state": "CA", "count": 15000 },
    { "state": "TX", "count": 12000 },
    { "state": "FL", "count": 10000 }
  ],
  "topCountries": [
    { "country": "US", "count": 300000 },
    { "country": "CA", "count": 15000 },
    { "country": "GB", "count": 5000 }
  ]
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. Future versions may add:
- Per-IP rate limits
- Per-API-key rate limits
- Request throttling

## Caching

API responses are cached for improved performance:
- Dataset metadata: 1 hour
- Query results: 5 minutes
- Statistics: 15 minutes

Cache keys are based on query parameters, so different queries have separate caches.

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

## Response Format

All successful responses follow this format:

```json
{
  "data": [...],
  "pagination": {
    "limit": number,
    "offset": number,
    "total": number,
    "hasMore": boolean
  }
}
```

Error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

## Examples

### Get recent sightings in California

```bash
curl "http://localhost:3000/api/dataset?state=CA&limit=10&sortBy=t_utc&sortOrder=desc"
```

### Search for specific terms

```bash
curl -X POST "http://localhost:3000/api/dataset/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "triangle",
    "filters": {"state": "NV"},
    "limit": 20
  }'
```

### Get dataset statistics

```bash
curl "http://localhost:3000/api/dataset/stats"
```

## SDK Usage

You can also use the dataset utilities directly in your code:

```typescript
import { queryDataset } from '@/lib/dataset';

const records = await queryDataset({
  filters: { state: 'CA' },
  limit: 10
});
```

See [Dataset Access Guide](./dataset-access.md) for more details.

