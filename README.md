# UFO Dataset Explorer

A Next.js 16 application for exploring the UFO sightings dataset from Hugging Face. This project provides a modern web interface, API endpoints, MCP server integration, and AnswerAgent connectivity for analyzing and exploring UFO sighting data.

[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **At a glance** — a full-stack data-exploration platform built around a 327k-record UFO sightings dataset. Next.js 16 App Router on the front, **Supabase + Postgres** for primary storage with row-level security policies and seeded migrations, **Neo4j** for entity-graph queries, **MCP server** for AI-agent access, plus a media-extraction layer that runs **PDF text extraction**, **audio transcription** (Whisper / AssemblyAI), and **image / video** ingestion through pluggable LLM providers (OpenAI / Ollama / Hugging Face NER).
>
> **What this repo demonstrates**
>
> - **End-to-end full-stack architecture** — 60+ App Router pages, 50+ API routes, Supabase migrations + RLS policies, Neo4j sync pipeline, MCP integration, all wired together with a clean abstraction over storage backends (filesystem / Supabase / HuggingFace API).
> - **Pluggable LLM provider layer** — `app/lib/llm/` lets every entity-extraction / NER / generation feature flip between OpenAI, local Ollama, and Hugging Face Inference API via env config (`LLM_PROVIDER=openai|ollama`, `NER_PROVIDER=huggingface|local`). Useful as a reference for building LLM features that aren't locked to one vendor.
> - **Multi-modal ingestion** — PDF, audio, video, image, and scrape pipelines, each with detail/list pages, deduplication, version history, and entity extraction. Audio + video pages handle transcription via Whisper or AssemblyAI behind a feature flag.
> - **Real database design** — `supabase/db/init/` ships nine migrations covering roles, auth, RLS, storage schemas, AI generations, the UFO clustered table, scraped pages, and a 21k-row seed of the Larry Hatch UDB UFO database (`008_seed_udb_data.sql`).
> - **Knowledge graph integration** — Companies / People / Locations / Programs are extracted from text and synced to Neo4j; the graph queries live in `app/lib/neo4j/queries.ts` and are surfaced through `/api/graph` routes.
> - **Honest dataset boundaries** — `data/` and the U.RND binary are gitignored; the repo ships only the code that loads them. Sample queries fall back to the public Hugging Face API if local files are missing.
>
> **Quickstart**
>
> ```bash
> nvm use                              # Node 24
> pnpm install
> cp env.template .env.local           # fill in keys
> pnpm supabase:start                  # docker-compose up Supabase + Neo4j
> pnpm setup-supabase                  # auto-generates JWT + role keys
> pnpm download-dataset                # fetch the HF dataset
> pnpm dev                             # http://localhost:3002
> ```
>
> Full setup (Supabase + Neo4j), API reference, and architecture docs live under [`docs/`](docs/).

---



## Dataset

This project uses the [UFO Sightings – Cleaned & Unified Dataset](https://huggingface.co/datasets/cjc0013/Ufo_data_clustered) from Hugging Face, which contains approximately **327,000 records** of UFO sightings merged from multiple publicly available Kaggle datasets.

### Dataset Features

- **Cleaned and standardized** data with consistent formatting
- **Enriched contextual fields** including moon illumination, airport proximity, weather data
- **Text similarity clustering** for grouping similar sightings
- **Geographic coordinates** for mapping and location-based queries
- **Temporal data** with UTC timestamps

See [Dataset Access Documentation](./docs/dataset-access.md) for detailed information about accessing and using the dataset.

## Features

- 🔍 **Interactive Dataset Explorer** - Browse and search through UFO sightings with a modern UI
- 🔎 **Advanced Search** - Filter by location, date, text content, cluster ID, and more
- 📊 **RESTful API** - Comprehensive API endpoints for programmatic access
- 🔌 **MCP Server** - Model Context Protocol server for AI agent integration (Vercel-compatible)
- 🤖 **AnswerAgent Integration** - Connect with AnswerAgent for enhanced natural language querying
- 📁 **Filesystem Storage** - Individual JSON files per record for efficient access
- 🗄️ **Supabase Integration** - Optional local Supabase instance for database and file storage
- 🔄 **Sync Capability** - Smart sync script that only downloads new/changed records
- 🏗️ **Database-Ready Architecture** - Abstraction layer allows easy migration to database
- 🔄 **Automatic Fallback** - Seamlessly falls back to Hugging Face API if local files unavailable

## Quick Start

### Prerequisites

- Node.js 24 (specified in `.nvmrc`)
- nvm (Node Version Manager) - recommended for managing Node.js versions
- npm, yarn, pnpm, or bun
- Git
- (Optional) Hugging Face account and token for API access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd uap
```

2. Set up Node.js version:
```bash
# If using nvm (recommended)
nvm use
# If Node.js 24 is not installed, run: nvm install 24

# Verify the version
node -v  # Should show v24.0.0 or higher
```

3. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp env.template .env.local
```

Edit `.env.local` and fill in your actual values:
- `HUGGINGFACE_TOKEN`: Optional - Get your token at https://huggingface.co/settings/tokens
  - Create a "Read" token (not Write)
  - Required for snapshot download method
  - NOT required for API method (USE_API=true) with public datasets
- `ANSWERAGENT_API_KEY`: Required for AnswerAgent integration
- `ANSWERAGENT_API_URL`: Optional - Defaults to https://api.answeragent.com
- `FORCE_DOWNLOAD`: Optional - Set to "true" to force re-download of dataset
- `USE_API`: Optional - Set to "true" to use API method (no token needed for public datasets)

4. (Optional) Set up local Supabase for database storage:
```bash
# Run setup script (generates secrets and config)
npm run setup-supabase

# Start Supabase services
npm run supabase:start
```

   See [Supabase Setup Guide](./docs/supabase-setup.md) for detailed instructions.

5. (Optional) Download dataset locally:
```bash
# Use API method (recommended - no token needed for public datasets)
USE_API=true npm run download-dataset

# Or use snapshot download method (requires token)
npm run download-dataset
```

   This will download and split the dataset into individual JSON files in `data/records/`.

   To sync/update the dataset later:
```bash
npm run sync-dataset
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

   If you started Supabase, you can also access:
   - Supabase Studio: [http://localhost:3001](http://localhost:3001)
   - Supabase API: [http://localhost:8000](http://localhost:8000)

## Project Structure

```
uap/
├── app/                    # Next.js 16 App Router
│   ├── api/               # API routes
│   │   ├── dataset/      # Dataset query endpoints
│   │   │   ├── route.ts  # Main query endpoint
│   │   │   ├── search/   # Search endpoint
│   │   │   └── stats/   # Statistics endpoint
│   │   └── mcp/          # MCP server handler
│   ├── components/        # React components
│   │   ├── DatasetExplorer.tsx
│   │   ├── SearchBar.tsx
│   │   └── SightingCard.tsx
│   ├── lib/               # Utility libraries
│   │   ├── data-access.ts # Data access abstraction layer
│   │   ├── dataset.ts     # Dataset query utilities
│   │   ├── huggingface.ts # Hugging Face API client
│   │   ├── mcp-handler.ts # MCP server logic
│   │   ├── answeragent.ts # AnswerAgent integration
│   │   └── stats.ts       # Statistics calculation
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── data/                   # Dataset storage (not in git)
│   └── records/           # Individual JSON files per record
├── docs/                   # Documentation
│   ├── dataset-access.md
│   ├── data-access-architecture.md
│   ├── api-reference.md
│   ├── mcp-server.md
│   └── answeragent-integration.md
├── scripts/               # Utility scripts
│   ├── download-dataset.js # Download and split dataset
│   ├── sync-dataset.js    # Sync/update dataset
│   └── setup-huggingface.js # Setup Hugging Face credentials
├── .cursorrules           # Cursor IDE rules
├── .claude-rules          # Claude agent rules
└── [config files]
```

## Documentation

- [Dataset Access Guide](./docs/dataset-access.md) - How to access and use the dataset
- [Data Access Architecture](./docs/data-access-architecture.md) - Architecture for filesystem/database abstraction
- [API Reference](./docs/api-reference.md) - API endpoint documentation
- [MCP Server Documentation](./docs/mcp-server.md) - MCP server setup and usage
- [Supabase Setup Guide](./docs/supabase-setup.md) - Local Supabase instance setup and usage

## Development

### Development Environment

This project requires **Node.js 24**. Before starting development:

1. **Ensure you're using the correct Node.js version:**
   ```bash
   nvm use
   # If Node.js 24 is not installed: nvm install 24
   node -v  # Should show v24.0.0 or higher
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see Installation section above)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run download-dataset` - Download and split dataset into individual JSON files
- `npm run sync-dataset` - Sync/update local dataset (only downloads new/changed records)
- `npm run setup-hf` - Set up Hugging Face credentials
- `npm run setup-supabase` - Set up local Supabase instance (run once)
- `npm run supabase:start` - Start Supabase services
- `npm run supabase:stop` - Stop Supabase services
- `npm run supabase:restart` - Restart Supabase services
- `npm run supabase:status` - Check Supabase service status
- `npm run supabase:logs` - View Supabase service logs

### Code Style

This project follows the guidelines defined in `.cursorrules` and `.claude-rules`. Key points:

- TypeScript for all code
- Next.js 16 App Router conventions
- Server Components by default
- Explicit Client Component marking
- RESTful API patterns

## Architecture

### Frontend
- Next.js 16 with App Router
- React 19 with Server Components
- TypeScript 5
- Tailwind CSS v4 for styling

### Backend
- Next.js API Routes (Route Handlers)
- Hugging Face Hub API for dataset access
- MCP server using Vercel handler pattern
- Data access abstraction layer for easy database migration

### Data Access
- **Filesystem-based**: Individual JSON files per record (recommended for production)
- **Hugging Face API**: Automatic fallback if local files unavailable
- **Abstraction Layer**: Easy migration to database without code changes
- Efficient pagination and streaming

## Deployment

This project is designed to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables:
   - `HUGGINGFACE_TOKEN` (optional, for API fallback)
   - `ANSWERAGENT_API_KEY` (optional, for AnswerAgent integration)
4. Deploy

**Note**: For production deployments, consider:
- Using a database instead of filesystem storage (see [Data Access Architecture](./docs/data-access-architecture.md))
- Setting up proper data storage (S3, database, etc.) for the `data/records/` directory
- The MCP server is configured to work with Vercel's serverless functions

## License

This project is for research and educational use. The dataset source data was public on Kaggle. Users should follow the original dataset licensing terms.

## Contributing

1. Follow the code style guidelines in `.cursorrules` and `.claude-rules`
2. Update documentation for new features
3. Test your changes thoroughly
4. Ensure data files are not committed (they're in `.gitignore`)
5. Submit pull requests with clear descriptions

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Run linter: `npm run lint`
6. Update documentation if needed
7. Submit a pull request

## Data Storage

The dataset is stored as individual JSON files in `data/records/`. This approach:

- Provides fast access without database overhead
- Makes it easy to migrate to a database later (see [Data Access Architecture](./docs/data-access-architecture.md))
- Allows efficient querying and filtering
- Keeps data out of version control (excluded via `.gitignore`)

To download the dataset:
```bash
npm run download-dataset
```

To sync/update:
```bash
npm run sync-dataset
```

## Support

For issues, questions, or contributions, please open an issue on the repository.

## Technology Stack

- **Runtime**: Node.js 24
- **Framework**: Next.js 16.1+ (App Router)
- **Language**: TypeScript 5.7+
- **UI**: React 19, Tailwind CSS v4
- **Data Access**: Filesystem (JSON files) with Hugging Face API fallback
- **Protocols**: MCP (Model Context Protocol)
- **Deployment**: Vercel (serverless functions)

### Key Dependencies

- `next` ^16.1.0 - Next.js framework
- `react` ^19.0.0 - React library
- `@huggingface/hub` ^2.7.1 - Hugging Face API client
- `@modelcontextprotocol/sdk` ^1.0.0 - MCP protocol support
- `tailwindcss` ^4.1.18 - CSS framework
- `typescript` ^5.7.2 - TypeScript compiler
- `@types/node` ^25.0.0 - Node.js type definitions (for Node 24)

## Acknowledgements

This project acknowledges the invaluable work of the [RR0/uDb](https://github.com/RR0/uDb) project, a Node.js application for reading binary data files from the *U* UFO database. The uDb project has been instrumental in preserving and making accessible historical UFO sighting data that was previously only available on legacy MS-DOS platforms.

Special recognition goes to:

- **Larry Hatch** - For his invaluable work in building the comprehensive *U* UFO database
- **RR0/uDb Contributors** - For creating and maintaining the modern Node.js reader that makes this historical data accessible
- **ATS Thread Contributors** (EvillerBob, nablator, harpy sounds) - For their analysis of the binary format, particularly in localizing latitude/longitude bytes and correcting format interpretations
- **Adam** - For notifying about a longitude inversion error
- **Isaac Koi** - For his relentless efforts in collecting and sharing UFO data with permission from data owners, including managing to run the legacy software, perform textual exports, and obtaining permission from Larry Hatch's nephew (holder of Larry's Power of Attorney) to share Larry's work

The uDb project has been credited in academic research, including Adam Kehoe's paper "Analyzing The Nearly Lost Hatch Database: 18,123 case files".

