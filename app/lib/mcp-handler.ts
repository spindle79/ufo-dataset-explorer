import { queryDataset, DatasetQuery } from './dataset';

export interface MCPRequest {
  jsonrpc: string;
  id: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, any>;
  };
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Handle MCP protocol requests
 */
export async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  try {
    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'query_ufo_dataset',
                description: 'Query the UFO sightings dataset with filtering and pagination',
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number', description: 'Number of records (default: 50, max: 1000)' },
                    offset: { type: 'number', description: 'Pagination offset (default: 0)' },
                    state: { type: 'string', description: 'Filter by state code' },
                    country: { type: 'string', description: 'Filter by country code' },
                    dateFrom: { type: 'string', description: 'Start date (ISO-8601)' },
                    dateTo: { type: 'string', description: 'End date (ISO-8601)' },
                    latMin: { type: 'number', description: 'Minimum latitude' },
                    latMax: { type: 'number', description: 'Maximum latitude' },
                    lonMin: { type: 'number', description: 'Minimum longitude' },
                    lonMax: { type: 'number', description: 'Maximum longitude' },
                    clusterId: { type: 'number', description: 'Filter by cluster ID' },
                    sortBy: { type: 'string', description: 'Field to sort by' },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' },
                  },
                },
              },
              {
                name: 'search_ufo_dataset',
                description: 'Full-text search across the dataset',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    filters: {
                      type: 'object',
                      description: 'Additional filters',
                      properties: {
                        state: { type: 'string' },
                        country: { type: 'string' },
                        dateFrom: { type: 'string' },
                        dateTo: { type: 'string' },
                        clusterId: { type: 'number' },
                      },
                    },
                    limit: { type: 'number' },
                    offset: { type: 'number' },
                    sortBy: { type: 'string' },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'] },
                  },
                  required: ['query'],
                },
              },
              {
                name: 'get_dataset_stats',
                description: 'Get statistics about the dataset',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        };

      case 'tools/call':
        if (!params?.name) {
          throw new Error('Tool name is required');
        }

        const toolName = params.name;
        const args = params.arguments || {};

        let result: any;

        switch (toolName) {
          case 'query_ufo_dataset': {
            const query: DatasetQuery = {
              limit: args.limit,
              offset: args.offset,
              state: args.state,
              country: args.country,
              dateFrom: args.dateFrom,
              dateTo: args.dateTo,
              latMin: args.latMin,
              latMax: args.latMax,
              lonMin: args.lonMin,
              lonMax: args.lonMax,
              clusterId: args.clusterId,
              sortBy: args.sortBy,
              sortOrder: args.sortOrder,
            };

            const datasetResult = await queryDataset(query);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(datasetResult, null, 2),
                },
              ],
            };
            break;
          }

          case 'search_ufo_dataset': {
            const query: DatasetQuery = {
              search: args.query,
              limit: args.limit,
              offset: args.offset,
              state: args.filters?.state,
              country: args.filters?.country,
              dateFrom: args.filters?.dateFrom,
              dateTo: args.filters?.dateTo,
              clusterId: args.filters?.clusterId,
              sortBy: args.sortBy,
              sortOrder: args.sortOrder,
            };

            const datasetResult = await queryDataset(query);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(datasetResult, null, 2),
                },
              ],
            };
            break;
          }

          case 'get_dataset_stats': {
            const { getDatasetStats } = await import('./stats');
            const stats = await getDatasetStats();
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(stats, null, 2),
                },
              ],
            };
            break;
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        return {
          jsonrpc: '2.0',
          id,
          result,
        };

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
        data: {
          details: error instanceof Error ? error.stack : String(error),
        },
      },
    };
  }
}

