# Supabase Storage Setup Guide

This guide explains how to set up and manage Supabase Storage buckets for the UFO Dataset Explorer.

## Overview

Supabase Storage is used to store original uploaded files (CSV, audio files, etc.) separately from the database. The database tables store only metadata and references to files in storage.

## Storage Buckets

The following storage buckets are used:

- **`original-uploads`** - General uploads bucket for all file types
- **`nuforc-files`** - NUFORC dataset files
- **`udb-files`** - UDB (Larry Hatch) dataset files
- **`audio-files`** - Audio files and recordings

## Initial Setup

### 1. Start Supabase

Make sure Supabase is running:

```bash
npm run supabase:start
```

### 2. Create Storage Buckets

Run the setup script to create all necessary buckets:

```bash
npm run setup-storage-buckets
```

This script will:
- Check if buckets already exist
- Create any missing buckets
- Configure bucket settings (private by default)

### 3. Verify Buckets

You can verify buckets were created in Supabase Studio:
- Navigate to http://localhost:3001
- Go to Storage section
- You should see all four buckets listed

## File Naming Convention

Files are stored using the following path structure:

```
{dataset_type}/{upload_id}/{original_filename}
```

Examples:
- `nuforc/550e8400-e29b-41d4-a716-446655440000/nuforc_reports.csv`
- `audio/550e8400-e29b-41d4-a716-446655440000/recording.mp3`
- `udb/550e8400-e29b-41d4-a716-446655440000/udb_export.csv`

## Access Control

### Current Configuration

All buckets are created as **private** by default. This means:
- Files are not publicly accessible via direct URLs
- You must use signed URLs for temporary access
- Admin/service role key is required for uploads

### Public Access (Optional)

If you need public read access for specific buckets:

1. Open Supabase Studio (http://localhost:3001)
2. Navigate to Storage → Select bucket
3. Click "Settings"
4. Toggle "Public bucket" to enabled

**Note:** Public buckets allow anyone with the URL to access files. Only enable this if files don't contain sensitive data.

### Row Level Security (RLS)

For production deployments, consider setting up RLS policies:

```sql
-- Example: Allow authenticated users to upload
CREATE POLICY "Users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'original-uploads');

-- Example: Allow public read access
CREATE POLICY "Public can read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'original-uploads');
```

## Using Storage in Code

### Upload a File

```typescript
import { uploadFileForDataset } from '@/lib/supabase-storage';

const result = await uploadFileForDataset(
  'nuforc',
  uploadId,
  'nuforc_reports.csv',
  fileBuffer,
  {
    contentType: 'text/csv',
    useAdmin: true, // Use admin client for uploads
  }
);

// result.path - Storage path
// result.url - Public URL (if bucket is public)
// result.bucket - Bucket name
```

### Get Public URL

```typescript
import { getPublicUrl } from '@/lib/supabase-storage';

const url = getPublicUrl('nuforc-files', 'nuforc/upload-id/file.csv');
```

### Get Signed URL (Private Files)

```typescript
import { getSignedUrl } from '@/lib/supabase-storage';

const signedUrl = await getSignedUrl(
  'nuforc-files',
  'nuforc/upload-id/file.csv',
  3600 // Expires in 1 hour
);
```

### Download a File

```typescript
import { downloadFile } from '@/lib/supabase-storage';

const blob = await downloadFile('nuforc-files', 'nuforc/upload-id/file.csv');
```

### Delete a File

```typescript
import { deleteFile } from '@/lib/supabase-storage';

await deleteFile('nuforc-files', 'nuforc/upload-id/file.csv', true);
```

## Storage Utilities

All storage functions are available in `app/lib/supabase-storage.ts`:

- `uploadFile()` - Upload to any bucket
- `uploadFileForDataset()` - Upload with automatic bucket selection
- `getPublicUrl()` - Get public URL for a file
- `getSignedUrl()` - Get temporary signed URL
- `downloadFile()` - Download file as Blob
- `deleteFile()` - Delete a file
- `listFiles()` - List files in a bucket/folder
- `fileExists()` - Check if file exists
- `getFileMetadata()` - Get file metadata

## Data Flow

1. **Upload File** → Supabase Storage
   - File stored in appropriate bucket
   - Path follows naming convention

2. **Create Database Record** → `original_uploads` table
   - Stores metadata (filename, size, MIME type, etc.)
   - Stores storage path reference
   - Links to dataset type

3. **Parse File** → Dataset-specific parsed table
   - Reads file from storage
   - Parses content
   - Stores parsed data in database

4. **Normalize Data** → `normalized_data` table
   - Extracts common fields
   - Creates unified records

## Troubleshooting

### Bucket Not Found

If you get "bucket not found" errors:

1. Verify buckets exist: `npm run setup-storage-buckets`
2. Check bucket name matches exactly (case-sensitive)
3. Verify Supabase is running: `npm run supabase:status`

### Permission Denied

If uploads fail with permission errors:

1. Ensure you're using admin client (`useAdmin: true`)
2. Check RLS policies in Supabase Studio
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### File Size Limits

By default, Supabase has file size limits:
- Local development: Usually 50MB
- Production: Configurable

To increase limits, modify bucket settings in Supabase Studio or use chunked uploads for large files.

## Best Practices

1. **Always use admin client for uploads** - Prevents permission issues
2. **Store metadata in database** - Don't rely on file system for queries
3. **Use signed URLs for private files** - More secure than public buckets
4. **Clean up orphaned files** - Delete files when database records are deleted
5. **Monitor storage usage** - Keep an eye on bucket sizes
6. **Use consistent naming** - Follow the `{dataset}/{id}/{filename}` pattern

## Migration from Filesystem

If migrating existing filesystem storage:

1. Upload existing files to Supabase Storage
2. Create `original_uploads` records for each file
3. Update code to use storage utilities instead of filesystem
4. Keep filesystem as backup until migration is verified

See `docs/data-access-architecture.md` for more details on the abstraction layer.

