# Table Patterns Review: Audio, PDF, and Web

## Overview

This document reviews the best practices and patterns used across Audio, PDF, and Web/Scraped Pages tables to ensure consistency.

## Audio Table Best Practices ✅

### Database Schema
- Uses `original_uploads` table with `dataset_type = 'audio'`
- Metadata stored in JSONB: `description`, `categories`, `currentTranscriptId`
- References `ai_generations` table for transcript versions

### Type Definitions
```typescript
interface AudioFile {
  id: string;
  fileName: string;
  originalUrl: string | null;
  uploadedDate: string;
  description: string;
  categories: string[];
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  currentTranscriptId?: string | null; // ✅ AI generation tracking
}
```

### API Endpoints
- `GET/PATCH /api/audio/[id]` - Get/update file metadata
- `GET/PUT /api/audio/[id]/transcript/current` - Get/set current transcript
- `GET/POST /api/audio/[id]/generations` - List/create AI generations
- `POST /api/audio/[id]/transcribe` - Run transcription

### UI Features
- ✅ Tabs structure: Audio, Transcript, History
- ✅ Edit modal for description/categories
- ✅ Upload modal (URL or file)
- ✅ Transcription modal with multiple services
- ✅ TranscriptionTable for version history
- ✅ Download button
- ✅ Set current transcript functionality

---

## PDF Table Best Practices ✅

### Database Schema
- Uses `original_uploads` table with `dataset_type = 'pdf'`
- Metadata stored in JSONB: `description`, `categories`, `currentExtractionId`
- References `ai_generations` table for extraction versions

### Type Definitions
```typescript
interface PdfFile {
  id: string;
  fileName: string;
  originalUrl: string | null;
  uploadedDate: string;
  description: string;
  categories: string[];
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  pageCount?: number;
  currentExtractionId?: string | null; // ✅ AI generation tracking
}
```

### API Endpoints
- `GET/PATCH /api/pdf/[id]` - Get/update file metadata
- `GET/PUT /api/pdf/[id]/extraction/current` - Get/set current extraction
- `GET/POST /api/pdf/[id]/generations` - List/create AI generations
- `POST /api/pdf/[id]/extract` - Run text extraction

### UI Features
- ❌ **MISSING**: Tabs structure (should have PDF, Extracted Text, History)
- ❌ **MISSING**: Edit modal for description/categories
- ✅ Upload modal (URL or file)
- ✅ Extraction modal with multiple services
- ✅ TranscriptionTable for version history
- ✅ Download button
- ✅ Set current extraction functionality

---

## Web/Scraped Pages Current State ⚠️

### Database Schema
- Uses `scraped_pages` table (separate from `original_uploads`)
- Has `description` and `categories` columns directly
- ❌ **MISSING**: No `currentGenerationId` or AI generation tracking

### Type Definitions
```typescript
interface ScrapedPage {
  id: string;
  url: string;
  domain: string | null;
  title: string;
  description: string;
  categories: string[];
  markdown_path: string | null;
  html_path: string | null;
  file_size: number | null;
  error: string | null;
  scraped_date: string;
  // ❌ MISSING: currentGenerationId for AI-generated summaries/extractions
}
```

### API Endpoints
- `GET /api/scrape/[id]` - Get page metadata
- `GET /api/scrape/[id]/content` - Get markdown content
- `GET /api/scrape/[id]/html` - Get HTML content
- ❌ **MISSING**: PATCH endpoint for updating metadata
- ❌ **MISSING**: AI generation endpoints
- ❌ **MISSING**: Current generation management

### UI Features
- ❌ **MISSING**: Tabs structure
- ❌ **MISSING**: Edit modal for description/categories
- ✅ Upload/scrape functionality
- ❌ **MISSING**: AI generation tracking
- ❌ **MISSING**: Download button
- ❌ **MISSING**: Version history table

---

## Recommendations

### For PDF
1. Add Edit modal (similar to Audio)
2. Add Tabs structure (PDF, Extracted Text, History)
3. Ensure consistent UI patterns with Audio

### For Web/Scraped Pages
1. Add `currentGenerationId` to `scraped_pages` table (or use metadata JSONB)
2. Add Edit modal for description/categories
3. Add Tabs structure (Content, Summary, History)
4. Integrate with `ai_generations` table for summaries/extractions
5. Add API endpoints for:
   - `PATCH /api/scrape/[id]` - Update metadata
   - `GET/PUT /api/scrape/[id]/generation/current` - Get/set current generation
   - `GET/POST /api/scrape/[id]/generations` - List/create AI generations
6. Add Download button
7. Add TranscriptionTable for version history

---

## Common Patterns to Maintain

1. **Metadata Storage**: Use JSONB in `original_uploads.metadata` for flexible fields
2. **AI Generation Tracking**: Store `currentGenerationId` in metadata or as direct column
3. **Version Management**: Use `ai_generations` table with version numbers
4. **UI Consistency**: 
   - Tabs for main content, AI content, and history
   - Edit modal for metadata
   - Upload modal with URL/file options
   - Version history table
   - Download button
5. **API Consistency**: Follow pattern of `/api/{type}/[id]` and `/api/{type}/[id]/{action}`
