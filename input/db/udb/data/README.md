# uDb Database Directory

This directory should contain the U.RND database file for the Larry Hatch UFO database.

## File Location

Place the U.RND file here, relative to the repository root:
```
input/db/udb/data/U.RND
```

## Alternative: Use NUFORC Database

If you don't have the U.RND file, you can use the NUFORC web database instead:

```typescript
import { queryUDb } from '@/app/lib/udb';

const result = await queryUDb({
  database: 'nuforc',
  match: 'year=2020',
  maxCount: 10
});
```

Or via API:
```
GET /api/udb?database=nuforc&match=year=2020&maxCount=10
```

## Obtaining the U.RND File

The U.RND file is not directly downloadable. You may need to:
1. Check the uDb repository for data files: https://github.com/RR0/uDb
2. Look for community resources that have preserved the database
3. Check historical archives or repositories

## File Size

The U.RND file is typically 10-50 MB in size. Make sure it's added to .gitignore.
