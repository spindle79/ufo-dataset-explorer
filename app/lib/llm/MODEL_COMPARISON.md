# LLM Model Comparison Guide

## Quick Comparison: llama3.1:8b vs nemotron-3-nano:30b

### llama3.1:8b (Current Default)
**Pros:**
- ✅ **Smaller & Faster**: 8B parameters, ~5GB RAM, faster inference
- ✅ **Well-Tested**: 108M+ pulls on Ollama, battle-tested
- ✅ **Excellent JSON**: Great at structured output for entity extraction
- ✅ **Lower Resource Usage**: Runs on most modern laptops/desktops
- ✅ **Established**: Stable, well-documented, many examples

**Cons:**
- ❌ Less capable for complex reasoning tasks
- ❌ Smaller context window (8K tokens)
- ❌ Not specifically optimized for agentic workflows

**Best For:**
- Entity extraction with JSON schemas
- Description generation
- General text processing
- Resource-constrained environments

---

### nemotron-3-nano:30b
**Pros:**
- ✅ **More Capable**: 30B parameters, better reasoning
- ✅ **Agentic Design**: Specifically built for tool use and agent workflows
- ✅ **Advanced Reasoning**: Better at complex relationship extraction
- ✅ **Very Recent**: Latest NVIDIA model (updated 1 month ago)
- ✅ **Tool Support**: Built-in support for function calling/tools

**Cons:**
- ❌ **Much Larger**: Requires ~20GB RAM (vs ~5GB for llama3.1:8b)
- ❌ **Slower**: Larger model = slower inference
- ❌ **Less Tested**: Only 109K pulls (vs 108M+ for llama3.1)
- ❌ **Newer**: Less community support/examples
- ❌ **Resource Intensive**: May not run on all systems

**Best For:**
- Complex relationship extraction
- Multi-step reasoning tasks
- Agentic workflows with tool use
- When you have sufficient RAM (20GB+)
- Advanced entity extraction with context understanding

---

## When to Use Each Model

### Use llama3.1:8b (Default) When:
- ✅ You have limited RAM (<16GB)
- ✅ You need fast responses
- ✅ You're doing standard entity extraction
- ✅ You want a stable, well-tested solution
- ✅ You're running on a laptop or standard desktop

### Use nemotron-3-nano:30b When:
- ✅ You have 20GB+ RAM available
- ✅ You need advanced reasoning capabilities
- ✅ You're extracting complex relationships
- ✅ You want the latest agentic model features
- ✅ Speed is less important than quality
- ✅ You're running on a powerful workstation/server

---

## Performance Expectations

### llama3.1:8b
- **RAM**: ~5GB
- **Speed**: Fast (seconds per request)
- **Quality**: Excellent for structured tasks
- **JSON Formatting**: ⭐⭐⭐⭐⭐
- **Entity Extraction**: ⭐⭐⭐⭐
- **Complex Reasoning**: ⭐⭐⭐

### nemotron-3-nano:30b
- **RAM**: ~20GB
- **Speed**: Moderate (slower than 8B)
- **Quality**: Excellent for complex tasks
- **JSON Formatting**: ⭐⭐⭐⭐
- **Entity Extraction**: ⭐⭐⭐⭐⭐
- **Complex Reasoning**: ⭐⭐⭐⭐⭐

---

## Recommendation

**Start with llama3.1:8b** (the default) because:
1. It works well for most entity extraction tasks
2. It's more accessible (runs on more hardware)
3. It's faster and more cost-effective
4. It's well-tested and stable

**Upgrade to nemotron-3-nano:30b** if:
1. You have sufficient RAM (20GB+)
2. You need better relationship extraction
3. You're doing complex multi-step reasoning
4. You need agentic capabilities

---

## How to Switch

To try nemotron-3-nano:30b:

```bash
# Pull the model (will download ~20GB)
ollama pull nemotron-3-nano:30b

# Update your .env.local
OLLAMA_DEFAULT_MODEL=nemotron-3-nano:30b
```

Then restart your application.
