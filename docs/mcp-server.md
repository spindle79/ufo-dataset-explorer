# MCP Server Documentation

This document describes the Model Context Protocol (MCP) server implementation for the UFO Dataset Explorer.

## Overview

The MCP server provides a standardized interface for AI agents and tools to interact with the UFO sightings dataset. It's implemented as a Next.js API route using Vercel's MCP handler pattern, making it compatible with serverless deployments.

## Architecture

The MCP server is implemented at `/api/mcp/route.ts` and follows the MCP protocol specification. It exposes tools that allow agents to:

- Query the UFO sightings dataset
- Search for specific sightings
- Get dataset statistics
- Filter and analyze data

## Setup

### Vercel Deployment

The MCP server is designed to work with Vercel's serverless functions. When deployed to Vercel:

1. The route automatically becomes available at `https://your-domain.com/api/mcp`
2. No additional configuration is needed
3. The server handles cold starts efficiently

### Local Development

For local development, the MCP server runs as part of the Next.js dev server:

```bash
npm run dev
```

The server will be available at `http://localhost:3000/api/mcp`

## MCP Tools

The server exposes the following tools:

### `query_ufo_dataset`

Query the UFO sightings dataset with filtering and pagination.

#### Parameters

```typescript
{
  limit?: number;        // Number of records (default: 50, max: 1000)
  offset?: number;        // Pagination offset (default: 0)
  state?: string;         // Filter by state code
  country?: string;       // Filter by country code
  dateFrom?: string;      // Start date (ISO-8601)
  dateTo?: string;        // End date (ISO-8601)
  latMin?: number;        // Minimum latitude
  latMax?: number;        // Maximum latitude
  lonMin?: number;        // Minimum longitude
  lonMax?: number;        // Maximum longitude
  clusterId?: number;     // Filter by cluster ID
  sortBy?: string;        // Field to sort by
  sortOrder?: "asc" | "desc";  // Sort order
}
```

#### Example

```json
{
  "name": "query_ufo_dataset",
  "arguments": {
    "limit": 10,
    "state": "CA",
    "sortBy": "t_utc",
    "sortOrder": "desc"
  }
}
```

#### Response

Returns an array of UFO sighting records with pagination metadata.

---

### `search_ufo_dataset`

Full-text search across the dataset.

#### Parameters

```typescript
{
  query: string;          // Search query
  filters?: {
    state?: string;
    country?: string;
    dateFrom?: string;
    dateTo?: string;
    // ... other filters
  };
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

#### Example

```json
{
  "name": "search_ufo_dataset",
  "arguments": {
    "query": "flying saucer",
    "filters": {
      "state": "NV"
    },
    "limit": 20
  }
}
```

#### Response

Returns matching records ranked by relevance.

---

### `get_dataset_stats`

Get statistics about the dataset.

#### Parameters

None

#### Example

```json
{
  "name": "get_dataset_stats",
  "arguments": {}
}
```

#### Response

Returns dataset statistics including:
- Total record count
- Date range
- Geographic bounds
- Top states/countries

---

## MCP Protocol

The server implements the MCP protocol as specified. All requests and responses follow the MCP message format:

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      // tool-specific arguments
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tool result"
      }
    ]
  }
}
```

### Error Format

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "details": "Error details"
    }
  }
}
```

## Integration Examples

### Using with Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "ufo-dataset": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://your-domain.com/api/mcp"
      ]
    }
  }
}
```

### Using with Other MCP Clients

The server can be accessed via HTTP POST requests:

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "query_ufo_dataset",
      "arguments": {
        "limit": 10,
        "state": "CA"
      }
    }
  }'
```

## Vercel Handler Pattern

The implementation uses Vercel's recommended pattern for MCP servers:

1. **Serverless Function**: Runs as a Vercel serverless function
2. **Request Handling**: Processes MCP protocol messages
3. **Tool Execution**: Executes tools and returns results
4. **Error Handling**: Properly formats errors according to MCP spec

### Code Structure

```typescript
// app/api/mcp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleMCPRequest } from '@/lib/mcp-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleMCPRequest(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body?.id || null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { details: error.message }
        }
      },
      { status: 500 }
    );
  }
}
```

## Performance Considerations

### Caching

- Tool results are cached when appropriate
- Cache keys are based on tool name and arguments
- Cache duration varies by tool type

### Rate Limiting

Future versions may implement rate limiting per client or API key.

### Cold Starts

Vercel serverless functions may experience cold starts. The implementation:
- Minimizes initialization overhead
- Uses efficient data access patterns
- Implements connection pooling where applicable

## Security

### Input Validation

All tool parameters are validated:
- Type checking
- Range validation
- Sanitization of string inputs

### Error Handling

Errors are handled securely:
- No sensitive information in error messages
- Proper error codes
- Logging for debugging (without exposing data)

## Testing

Test the MCP server locally:

```bash
# Start dev server
npm run dev

# In another terminal, test with curl
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list"
  }'
```

## Troubleshooting

### Server Not Responding

1. Check that the Next.js server is running
2. Verify the route is accessible: `http://localhost:3000/api/mcp`
3. Check server logs for errors

### Invalid Tool Calls

1. Verify tool name is correct
2. Check parameter types match expected schema
3. Review error messages for specific issues

### Performance Issues

1. Use appropriate limits for queries
2. Implement caching on the client side
3. Consider using local dataset access for bulk operations

## Future Enhancements

- Additional tools for advanced analysis
- Streaming support for large result sets
- WebSocket support for real-time updates
- Authentication and API keys
- Rate limiting and quotas

## Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

