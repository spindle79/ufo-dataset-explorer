# AnswerAgent Integration

This document describes how to integrate AnswerAgent with the UFO Dataset Explorer.

## Overview

AnswerAgent integration allows you to query the UFO dataset using natural language questions. The integration provides a bridge between AnswerAgent's question-answering capabilities and the structured UFO sightings data.

## Setup

### Environment Variables

Add the following to your `.env.local` file:

```bash
ANSWERAGENT_API_URL=https://api.answeragent.com
ANSWERAGENT_API_KEY=your_api_key_here
```

### Configuration

The AnswerAgent integration is configured through environment variables:

- `ANSWERAGENT_API_URL`: The base URL for the AnswerAgent API (default: `https://api.answeragent.com`)
- `ANSWERAGENT_API_KEY`: Your AnswerAgent API key (required)

## Usage

### Basic Query

```typescript
import { queryAnswerAgent } from '@/app/lib/answeragent';

const response = await queryAnswerAgent({
  question: 'What are the most common types of UFO sightings in California?',
  filters: {
    state: 'CA',
  },
});
```

### With Dataset Context

```typescript
import { queryDatasetWithAnswerAgent } from '@/app/lib/answeragent';

const response = await queryDatasetWithAnswerAgent(
  'Tell me about triangle-shaped UFOs',
  {
    state: 'NV',
    dateFrom: '2020-01-01',
  }
);
```

### Connection Check

```typescript
import { connectAnswerAgent } from '@/app/lib/answeragent';

const status = await connectAnswerAgent();
if (status.connected) {
  console.log('AnswerAgent is ready');
} else {
  console.error('Connection failed:', status.message);
}
```

## API Reference

### `queryAnswerAgent(query, config?)`

Query AnswerAgent with a question about the UFO dataset.

**Parameters:**
- `query`: `AnswerAgentQuery` - The query object
  - `question`: string - The question to ask
  - `context?`: Record<string, any> - Additional context
  - `filters?`: Record<string, any> - Dataset filters
- `config?`: `AnswerAgentConfig` - Optional configuration override

**Returns:** `Promise<AnswerAgentResponse>`

**Example:**
```typescript
const response = await queryAnswerAgent({
  question: 'What patterns do you see in recent UFO sightings?',
  filters: {
    dateFrom: '2023-01-01',
  },
});
```

### `connectAnswerAgent(config?)`

Test the connection to AnswerAgent.

**Parameters:**
- `config?`: `AnswerAgentConfig` - Optional configuration override

**Returns:** `Promise<{ connected: boolean; message: string }>`

### `queryDatasetWithAnswerAgent(question, datasetFilters?)`

Convenience function that combines dataset querying with AnswerAgent.

**Parameters:**
- `question`: string - The question to ask
- `datasetFilters?`: Record<string, any> - Filters to apply to the dataset

**Returns:** `Promise<AnswerAgentResponse>`

## Response Format

```typescript
interface AnswerAgentResponse {
  answer: string;              // The answer to your question
  sources?: string[];          // Source references
  confidence?: number;          // Confidence score (0-1)
  metadata?: Record<string, any>; // Additional metadata
}
```

## Integration Patterns

### Pattern 1: Direct Query

Ask AnswerAgent a question with dataset context:

```typescript
const response = await queryAnswerAgent({
  question: 'What are the top 5 states for UFO sightings?',
  context: {
    source: 'ufo-dataset',
    filters: { country: 'US' },
  },
});
```

### Pattern 2: Filtered Query

Query with specific dataset filters:

```typescript
const response = await queryAnswerAgent({
  question: 'Describe the characteristics of sightings near airports',
  filters: {
    nearest_airport_km: { $lt: 10 }, // Within 10km of airport
  },
});
```

### Pattern 3: Temporal Analysis

Ask questions about specific time periods:

```typescript
const response = await queryDatasetWithAnswerAgent(
  'What changed in UFO sighting patterns between 2020 and 2023?',
  {
    dateFrom: '2020-01-01',
    dateTo: '2023-12-31',
  }
);
```

## Error Handling

Always handle errors when using AnswerAgent:

```typescript
try {
  const response = await queryAnswerAgent({
    question: 'Your question here',
  });
  // Use response
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('API key')) {
      // Handle missing API key
    } else if (error.message.includes('timeout')) {
      // Handle timeout
    } else {
      // Handle other errors
    }
  }
}
```

## Best Practices

1. **Provide Context**: Always include relevant dataset filters in your queries
2. **Handle Errors**: Always wrap AnswerAgent calls in try-catch blocks
3. **Check Connection**: Verify connection before making queries in production
4. **Cache Results**: Consider caching answers for frequently asked questions
5. **Validate Input**: Ensure questions are clear and specific

## Troubleshooting

### "AnswerAgent API key is required"

- Ensure `ANSWERAGENT_API_KEY` is set in `.env.local`
- Restart your development server after adding the key
- Verify the key is correct

### Connection Timeouts

- Check your network connection
- Verify the `ANSWERAGENT_API_URL` is correct
- Increase the timeout in the config if needed

### Invalid Responses

- Ensure your questions are clear and specific
- Provide relevant context and filters
- Check that the dataset is accessible

## Future Enhancements

- Streaming responses for long answers
- Batch query support
- Custom model configuration
- Response caching
- Integration with frontend components

## Additional Resources

- [AnswerAgent Documentation](https://docs.answeragent.com)
- [API Reference](./api-reference.md)
- [Dataset Access Guide](./dataset-access.md)

