# Supabase Local Setup Guide

This guide explains how to set up and use a local Supabase instance for storing data and files in this application.

## Overview

Supabase is an open-source Firebase alternative that provides:
- **PostgreSQL Database** - Full-featured relational database
- **Storage** - File storage with automatic CDN
- **Auth** - User authentication and authorization
- **Realtime** - Real-time subscriptions
- **REST API** - Auto-generated REST API from your database schema

## Prerequisites

- Docker Desktop installed and running on macOS
- Node.js 24 (as specified in `.nvmrc`)
- npm/pnpm/yarn installed

## Initial Setup

1. **Run the setup script:**
   ```bash
   npm run setup-supabase
   ```

   This script will:
   - Check if Docker is running
   - Create necessary directories
   - Generate secure secrets (JWT, API keys, passwords)
   - Update `.env.local` with configuration
   - Configure the Kong API Gateway

2. **Start Supabase:**
   ```bash
   npm run supabase:start
   ```

   This starts all Supabase services in Docker containers.

3. **Verify it's running:**
   ```bash
   npm run supabase:status
   ```

   You should see all services running.

## Accessing Supabase

Once started, you can access:

- **Supabase Studio (Admin UI)**: http://localhost:3001
  - Visual database management
  - Table editor
  - SQL editor
  - API documentation

- **API URL**: http://localhost:8000
  - Main API endpoint
  - Use with `SUPABASE_ANON_KEY` for client-side
  - Use with `SUPABASE_SERVICE_ROLE_KEY` for server-side

- **Database Connection**:
  - Host: `localhost`
  - Port: `54325`
  - Database: `postgres`
  - User: `postgres`
  - Password: (check `.env.local` for `POSTGRES_PASSWORD`)

## Available Commands

```bash
# Initial setup (run once)
npm run setup-supabase

# Start Supabase services
npm run supabase:start

# Stop Supabase services
npm run supabase:stop

# Restart Supabase services
npm run supabase:restart

# View logs
npm run supabase:logs

# Check status
npm run supabase:status
```

## Environment Variables

After running `setup-supabase`, your `.env.local` will contain:

- `SUPABASE_URL` - API endpoint (http://localhost:8000)
- `SUPABASE_ANON_KEY` - Public key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` - Private key for server-side operations (keep secret!)
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret
- And other configuration variables

## Using Supabase in Your Code

### Server-Side (API Routes, Server Components)

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';

// In API route or server component
const supabase = getSupabaseAdmin();

// Example: Query data
const { data, error } = await supabase
  .from('sightings')
  .select('*')
  .limit(10);
```

### Client-Side (Client Components)

```typescript
'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [data, setData] = useState(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('sightings')
        .select('*');
      if (data) setData(data);
    }
    fetchData();
  }, []);

  return <div>{/* ... */}</div>;
}
```

## Database Schema

You'll need to create your database schema. You can do this via:

1. **Supabase Studio** (http://localhost:3001)
   - Use the Table Editor
   - Or use the SQL Editor

2. **SQL Scripts**
   - Place migration scripts in `supabase/db/init/`
   - They'll run automatically on first startup

Example schema for UFO sightings:

```sql
-- Create sightings table
CREATE TABLE IF NOT EXISTS sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  t_utc TIMESTAMPTZ,
  city TEXT,
  state TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  text TEXT,
  cluster_id INTEGER,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sightings_uid ON sightings(uid);
CREATE INDEX IF NOT EXISTS idx_sightings_t_utc ON sightings(t_utc);
CREATE INDEX IF NOT EXISTS idx_sightings_location ON sightings(lat, lon);
CREATE INDEX IF NOT EXISTS idx_sightings_cluster_id ON sightings(cluster_id);
```

## Storage

Supabase Storage can be used for file uploads (e.g., audio files):

```typescript
// Upload a file
const { data, error } = await supabase.storage
  .from('audio-files')
  .upload('path/to/file.mp3', file);

// Download a file
const { data, error } = await supabase.storage
  .from('audio-files')
  .download('path/to/file.mp3');
```

## Migration from Filesystem

The application currently uses filesystem storage. To migrate to Supabase:

1. Create the database schema (see above)
2. Implement a `SupabaseDataAccess` class that implements the `DataAccess` interface
3. Migrate existing data using a migration script
4. Update `getDataAccess()` to use the Supabase implementation

See `docs/data-access-architecture.md` for more details on the abstraction layer.

## Troubleshooting

### Docker not running
```bash
# Start Docker Desktop, then:
npm run supabase:start
```

### Port conflicts
If ports 3001, 8000, 54325, etc. are in use, you can modify `docker-compose.yml` to use different ports.

### Services not starting
```bash
# Check logs
npm run supabase:logs

# Restart services
npm run supabase:restart
```

### Reset everything
```bash
# Stop and remove containers
npm run supabase:stop
docker-compose down -v

# Remove data (WARNING: deletes all data!)
rm -rf supabase/db/volumes/data
rm -rf supabase/storage/*

# Run setup again
npm run setup-supabase
npm run supabase:start
```

## Production Considerations

For production deployments:

1. **Use Supabase Cloud** - Sign up at https://supabase.com
2. **Or self-host** - Use the same Docker setup on your server
3. **Environment Variables** - Use production secrets
4. **Backup Strategy** - Set up regular database backups
5. **Security** - Never expose `SERVICE_ROLE_KEY` in client-side code

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

