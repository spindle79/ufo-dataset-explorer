# Data Access Architecture

This document describes the data access architecture designed for easy migration from filesystem to database.

## Overview

The project uses a **data access abstraction layer** that allows switching between different storage backends without changing the application code. Currently implemented with filesystem storage, but designed to be easily replaceable with a database.

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer                │
│  (API Routes, Components, etc.)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Dataset Query Functions            │
│  (queryDataset, streamDataset, etc.)    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Data Access Abstraction           │
│  (DataAccess interface)                │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│ Filesystem   │   │  Database    │
│ Implementation│   │ Implementation│
│ (Current)    │   │ (Future)     │
└──────────────┘   └──────────────┘
```

## Data Access Interface

The `DataAccess` interface defines the contract for all storage implementations:

```typescript
interface DataAccess {
  getById(uid: string): Promise<UFOSighting | null>;
  getByIds(uids: string[]): Promise<UFOSighting[]>;
  getAll(filters?: Record<string, any>): AsyncGenerator<UFOSighting>;
  getCount(filters?: Record<string, any>): Promise<number>;
  isAvailable(): Promise<boolean>;
}
```

## Current Implementation: Filesystem

### File Structure

Each record is stored as a separate JSON file:

```
data/
└── records/
    ├── scrubbed_row327047.json
    ├── scrubbed_row327048.json
    └── ...
```

### File Naming

- UIDs are sanitized for filesystem compatibility
- `/` characters are replaced with `_`
- Example: `scrubbed/row327047` → `scrubbed_row327047.json`

### Benefits

1. **Simple**: No database setup required
2. **Portable**: Easy to backup and move
3. **Version Control Friendly**: Can track changes (though we don't commit data)
4. **Easy Migration**: Can easily import into database later

## Future Implementation: Database

To migrate to a database, simply create a new implementation:

```typescript
class DatabaseDataAccess implements DataAccess {
  async getById(uid: string): Promise<UFOSighting | null> {
    // Database query implementation
  }
  
  async getAll(filters?: Record<string, any>): AsyncGenerator<UFOSighting> {
    // Database query with streaming
  }
  
  // ... other methods
}
```

Then swap the implementation:

```typescript
import { setDataAccess } from '@/lib/data-access';
import { DatabaseDataAccess } from '@/lib/database-access';

setDataAccess(new DatabaseDataAccess());
```

## API Abstraction

The API routes use the abstraction layer, so they don't need to change:

```typescript
// app/api/dataset/route.ts
import { queryDataset } from '@/lib/dataset';

export async function GET(request: NextRequest) {
  // This works with filesystem or database
  const result = await queryDataset(query);
  return NextResponse.json(result);
}
```

## Migration Strategy

### From Filesystem to Database

1. **Create Database Implementation**
   - Implement `DataAccess` interface
   - Use your preferred database (PostgreSQL, MongoDB, etc.)

2. **Import Data**
   - Read all files from `data/records/`
   - Insert into database
   - Verify data integrity

3. **Swap Implementation**
   - Update initialization code to use database
   - Remove filesystem implementation (optional)

4. **No API Changes Required**
   - All API routes continue to work
   - Frontend components unchanged

### Example Migration

```typescript
// scripts/migrate-to-database.js
import { getDataAccess } from './app/lib/data-access';
import { DatabaseDataAccess } from './app/lib/database-access';

async function migrate() {
  const fsAccess = getDataAccess();
  const dbAccess = new DatabaseDataAccess();
  
  let count = 0;
  for await (const record of fsAccess.getAll()) {
    await dbAccess.save(record); // Assuming save method
    count++;
    if (count % 1000 === 0) {
      console.log(`Migrated ${count} records...`);
    }
  }
  
  // Switch to database
  setDataAccess(dbAccess);
  console.log('Migration complete!');
}
```

## Performance Considerations

### Filesystem

- **Pros**: Fast for small datasets, no network overhead
- **Cons**: Slower for complex queries, limited scalability

### Database

- **Pros**: Fast queries with indexes, scales well, concurrent access
- **Cons**: Requires database setup, network overhead

## Best Practices

1. **Always use the abstraction layer** - Don't access storage directly
2. **Keep the interface simple** - Don't add storage-specific methods
3. **Test both implementations** - Ensure compatibility
4. **Document migration steps** - Make it easy for future developers

## Current Status

- ✅ Filesystem implementation complete
- ✅ Abstraction layer in place
- ✅ API routes use abstraction
- ⏳ Database implementation (future)

## Additional Resources

- [Dataset Access Guide](./dataset-access.md)
- [API Reference](./api-reference.md)

