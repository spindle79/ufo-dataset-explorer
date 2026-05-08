# LLM Provider Configuration

This project supports multiple LLM providers for entity extraction, description generation, and relationship extraction. You can switch between OpenAI and local Ollama models via environment variables.

## Configuration

### Using OpenAI (Default)

Set in your `.env.local`:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
```

### Using Ollama (Local LLM)

1. **Install Ollama**: Download from [https://ollama.ai](https://ollama.ai)

2. **Start Ollama**: The Ollama service should be running (usually starts automatically)

3. **Pull a model**: Download a model you want to use:
   ```bash
   ollama pull llama3
   # or
   ollama pull mistral
   # or
   ollama pull phi3
   ```

4. **Configure environment**:
   ```bash
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434  # Default, optional
   OLLAMA_DEFAULT_MODEL=llama3.1:8b  # Optional, defaults to llama3.1:8b
   ```

## Available Models

### OpenAI Models
- `gpt-5-nano` (default)
- `gpt-5-mini`
- `gpt-5`
- `gpt-4o-mini`
- `gpt-4o`

### Ollama Models (Recommended for this project)

**Best for Entity Extraction & JSON Tasks:**
- `llama3.1:8b` ⭐ **Default** - Latest Llama 3.1, excellent JSON formatting, 108M+ pulls, ~5GB RAM
- `nemotron-3-nano:30b` - NVIDIA's agentic model, excellent for complex reasoning & tool use, ~20GB RAM, very new (1 month old)
- `llama3.1:70b` - More capable but requires more RAM (40GB+)
- `qwen2.5:7b` - Great for long context (128K tokens), multilingual, good structured output
- `llama3.3:70b` - Newest, similar to 3.1 405B but smaller

**Good General Purpose:**
- `mistral` - 7B model, well-tested, 24M+ pulls
- `llama3.2:3b` - Smaller, faster, good for lower-end hardware
- `phi3` - Microsoft's lightweight 3B/14B models

**For Speed (Smaller Models):**
- `llama3.2:1b` - Very fast, minimal RAM (~2GB)
- `phi3:3.8b` - Fast, good performance for size
- `gemma2:2b` - Google's efficient 2B model

**For Maximum Quality & Agentic Tasks:**
- `nemotron-3-nano:30b` - NVIDIA's latest, designed for agentic workflows, tool use, and complex reasoning. Excellent for advanced entity extraction with relationships. Requires ~20GB RAM.
- `llama3.1:405b` - Largest, most capable (requires significant RAM)
- `mistral-large` - 123B parameter model

To see all available models:
```bash
ollama list
```

To pull a model:
```bash
ollama pull llama3.1:8b
```

## Usage

The LLM abstraction layer is used automatically by:
- Entity extraction (`extractEntities`)
- Description generation (`generateDescription`)
- Relationship extraction (`extractRelationships`)

All functions will use the configured provider automatically. You can optionally specify a model:

```typescript
import { extractEntities } from '@/lib/entity-extraction';

// Uses default model from config
const entities = await extractEntities(content);

// Uses specific model
const entities = await extractEntities(content, 'llama3');
```

## Checking Ollama Availability

You can check if Ollama is running:

```typescript
import { getLLMClient } from '@/lib/llm/client';

const client = getLLMClient();
if (client.getProvider() === 'ollama') {
  const isAvailable = await client.checkOllamaAvailability();
  console.log('Ollama available:', isAvailable);
}
```

## Performance Considerations

- **OpenAI**: Fast, reliable, but costs money per API call
- **Ollama**: Free, runs locally, but:
  - First request may be slower (model loading)
  - Requires sufficient RAM (models are 2-7GB typically)
  - Slower than OpenAI for complex tasks
  - No internet required after model download

## Troubleshooting

### Ollama Connection Errors

If you see "Cannot connect to Ollama":
1. Make sure Ollama is installed and running
2. Check that `OLLAMA_BASE_URL` matches your Ollama instance
3. Verify Ollama is running: `ollama list` should work

### Model Not Found

If you see model errors:
1. Make sure you've pulled the model: `ollama pull llama3.1:8b` (or your chosen model)
2. Check available models: `ollama list`
3. Verify `OLLAMA_DEFAULT_MODEL` matches a pulled model
4. **Note**: Model names include size suffixes (e.g., `llama3.1:8b`, `llama3.1:70b`). Make sure to use the full name with the size suffix.

### JSON Format Issues

Some local models may have trouble with strict JSON formatting. The abstraction layer tries to clean up responses, but if you encounter issues:
- Try a different model (llama3 is generally good with JSON)
- Use OpenAI for critical JSON extraction tasks
- Check the model's documentation for JSON mode support
