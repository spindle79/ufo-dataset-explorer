# AI Agent Plan: Decode uDb Position References (Page, Volume, Issue)

## Objective

Reverse-engineer the encoding scheme for the `refIndex` field (11 bits) in the uDb binary database format to properly decode page numbers, volume numbers, and issue numbers from source references.

## Problem Statement

**Current State**: The `refIndex` field (11 bits, range 0-2047) is currently treated as a simple page number, but it likely encodes multiple values:
- Page number
- Volume number (for multi-volume works)
- Issue number (for periodicals)

**Goal**: Determine the encoding scheme and implement proper decoding to extract all three values.

## Context

- **Repository**: [RR0/uDb](https://github.com/RR0/uDb)
- **Database**: Larry Hatch's *U* UFO database (MS-DOS binary format)
- **Current Implementation**: `node_modules/@rr0/udb/dist/input/db/udb/Sources.js`
- **Record Reader**: `node_modules/@rr0/udb/dist/input/db/udb/UdbRecordReader.js`
- **Field Structure**:
  - `ref`: 1 byte (0-255) - Source document identifier
  - `refIndexHigh`: 3 bits - High bits (stored in day field)
  - `refIndex`: 1 byte (8 bits) - Low bits
  - **Combined**: `refIndex = (refIndexHigh << 8) + refIndex` (11 bits, 0-2047)

## Data Sources to Analyze

### 1. Extract All Records with Source References

**Action**: Create a script to extract all records from the database with their `ref` and `refIndex` values.

**Location**: 
- Database file: `node_modules/@rr0/udb/data/udb/input/U.RND`
- Sources file: `node_modules/@rr0/udb/data/udb/input/usources.txt`

**Script to create**: `scripts/analyze-refindex.js`

**Output**: JSON file with structure:
```json
{
  "records": [
    {
      "id": 1,
      "ref": 2,
      "refIndex": 320,
      "refIndexHigh": 1,
      "refIndexLow": 64,
      "currentReference": "VALLEE,Jacques: UFOS IN SPACE..., page n°320",
      "sourceName": "VALLEE,Jacques: UFOS IN SPACE- Anatomy of a Phenomenon..."
    }
  ],
  "sources": {
    "2": "VALLEE,Jacques: UFOS IN SPACE- Anatomy of a Phenomenon..."
  }
}
```

### 2. Analyze Source Types

**Action**: Categorize sources by type to identify encoding patterns.

**Categories to identify**:
- Single-volume books (no volume/issue needed)
- Multi-volume books (volume + page)
- Periodicals/Journals (volume + issue + page)
- Newspapers (date-based, may use different encoding)
- Special references (ref 93, 96, 97, 98)

**Method**: Parse `usources.txt` and analyze source descriptions for keywords:
- "Volume", "Vol.", "Tome"
- "Issue", "No.", "Number"
- "Monthly", "Quarterly", "Journal"
- "Book", "Report"

### 3. Collect Known Correct Citations

**Action**: Find records where the actual page/volume/issue is known or can be verified.

**Sources**:
- Records with `refIndex` values that seem suspicious (e.g., > 500 for a single book)
- Records referencing periodicals (likely to have issues)
- Cross-reference with exported CSV data if available
- Check if any records have volume/issue info in description fields

## Analysis Steps

### Step 1: Statistical Analysis

**Create**: `scripts/refindex-statistics.js`

**Analyze**:
1. Distribution of `refIndex` values by source type
2. Frequency of `refIndex` values per `ref` (same source)
3. Maximum `refIndex` per source (hint: max page count)
4. Patterns in `refIndexHigh` vs `refIndexLow` bits
5. Clustering analysis to identify encoding boundaries

**Hypotheses to test**:
- If max `refIndex` for a book is ~400, pages might be in lower bits
- If values cluster around multiples (100, 1000), might be packed format
- If `refIndexHigh` is rarely > 0, volume/issue might be in lower bits

### Step 2: Bit Field Analysis

**Create**: `scripts/refindex-bit-analysis.js`

**Test encoding schemes**:

**Scheme A: Bit Field Encoding**
```javascript
// Test various bit splits
const schemes = [
  { page: 7, volume: 2, issue: 2 },  // 7+2+2 = 11 bits
  { page: 8, volume: 2, issue: 1 },  // 8+2+1 = 11 bits
  { page: 6, volume: 3, issue: 2 },  // 6+3+2 = 11 bits
  { page: 9, volume: 1, issue: 1 },   // 9+1+1 = 11 bits
];

function decodeBitField(refIndex, scheme) {
  const pageMask = (1 << scheme.page) - 1;
  const volumeMask = (1 << scheme.volume) - 1;
  const issueMask = (1 << scheme.issue) - 1;
  
  const page = refIndex & pageMask;
  const volume = (refIndex >> scheme.page) & volumeMask;
  const issue = (refIndex >> (scheme.page + scheme.volume)) & issueMask;
  
  return { page, volume, issue };
}
```

**Scheme B: Packed Decimal Encoding**
```javascript
// Test various multipliers
const multipliers = [
  { page: 1, volume: 100, issue: 1000 },
  { page: 1, volume: 1000, issue: 100 },
  { page: 1, volume: 100, issue: 10000 },
];

function decodePacked(refIndex, mult) {
  const page = refIndex % mult.volume;
  const volume = Math.floor((refIndex % mult.issue) / mult.volume);
  const issue = Math.floor(refIndex / mult.issue);
  return { page, volume, issue };
}
```

**Scheme C: Source-Type Dependent Encoding**
```javascript
// Different encoding per source type
function decodeBySourceType(ref, refIndex) {
  if (isPeriodical(ref)) {
    // Periodical encoding
  } else if (isMultiVolume(ref)) {
    // Multi-volume encoding
  } else {
    // Single volume encoding (just page)
  }
}
```

### Step 3: Pattern Matching

**Create**: `scripts/refindex-pattern-match.js`

**Approach**:
1. Group records by `ref` (same source)
2. Look for sequences in `refIndex` values
3. Identify if values increase monotonically (suggests page numbers)
4. Look for repeating patterns (suggests issue numbers)
5. Check if `refIndexHigh` changes correlate with volume boundaries

**Validation**:
- If decoding produces page numbers > 1000 for a book, likely wrong
- If decoding produces issue numbers > 12 for monthly, likely wrong
- If decoding produces volume numbers > 10 for most sources, likely wrong

### Step 4: Cross-Reference with Known Data

**Action**: Compare decoded values with any available ground truth.

**Sources**:
- Check if exported CSV has any volume/issue information
- Look for records where description mentions "volume", "issue", "page"
- Search for known citations online to verify
- Check if original MS-DOS software output is available

## Implementation Plan

### Phase 1: Data Extraction and Analysis

1. **Create extraction script** (`scripts/extract-refindex-data.js`)
   - Read all records from `U.RND`
   - Extract `ref`, `refIndex`, `refIndexHigh`, `refIndexLow`
   - Load source names from `usources.txt`
   - Output JSON dataset

2. **Create analysis scripts**:
   - `scripts/refindex-statistics.js` - Statistical analysis
   - `scripts/refindex-bit-analysis.js` - Bit field testing
   - `scripts/refindex-pattern-match.js` - Pattern detection

3. **Run analysis**:
   ```bash
   node scripts/extract-refindex-data.js > data/refindex-raw.json
   node scripts/refindex-statistics.js data/refindex-raw.json > data/refindex-stats.json
   node scripts/refindex-bit-analysis.js data/refindex-raw.json > data/refindex-candidates.json
   ```

### Phase 2: Hypothesis Testing

1. **Generate candidate encoding schemes** based on analysis
2. **Test each scheme** against all records
3. **Score schemes** by:
   - Reasonableness of decoded values (page < 1000, issue < 100, volume < 50)
   - Consistency within same source
   - Pattern matching (sequential pages, repeating issues)

4. **Select best candidate(s)** for further validation

### Phase 3: Implementation

1. **Create decoding function** in new file: `node_modules/@rr0/udb/src/input/db/udb/PositionDecoder.ts`

   ```typescript
   export interface PositionReference {
     page?: number;
     volume?: number;
     issue?: number;
   }

   export class PositionDecoder {
     static decode(ref: number, refIndex: number, sourceType: SourceType): PositionReference {
       // Implementation based on discovered encoding scheme
     }
   }
   ```

2. **Update `Sources.ts`**:
   - Add method to determine source type
   - Integrate `PositionDecoder`
   - Update `getReference()` to format with volume/issue

3. **Update `UdbRecordFormatter.ts`**:
   - Pass decoded position reference to formatter
   - Format output: "Source, Volume X, Issue Y, page Z"

### Phase 4: Validation

1. **Manual verification**:
   - Select 20-50 records with known sources
   - Verify decoded values make sense
   - Check against actual source documents if available

2. **Automated validation**:
   - Check all decoded values are within reasonable ranges
   - Verify no negative values
   - Check consistency within same source

3. **Regression testing**:
   - Ensure existing functionality still works
   - Test edge cases (refIndex = 0, refIndex = 2047)

## Success Criteria

1. ✅ Decoded page numbers are reasonable (< 2000 for books, < 500 for articles)
2. ✅ Decoded volume numbers are reasonable (< 50 for most sources)
3. ✅ Decoded issue numbers are reasonable (< 100 for periodicals)
4. ✅ Records from same source show consistent patterns
5. ✅ Implementation handles all source types (books, periodicals, special refs)
6. ✅ Output format is clear and bibliographically correct
7. ✅ No breaking changes to existing API

## Files to Create/Modify

### New Files
- `scripts/extract-refindex-data.js` - Extract raw data
- `scripts/refindex-statistics.js` - Statistical analysis
- `scripts/refindex-bit-analysis.js` - Bit field testing
- `scripts/refindex-pattern-match.js` - Pattern detection
- `scripts/validate-decoding.js` - Validation script
- `node_modules/@rr0/udb/src/input/db/udb/PositionDecoder.ts` - Decoder implementation

### Files to Modify
- `node_modules/@rr0/udb/src/input/db/udb/Sources.ts` - Add position decoding
- `node_modules/@rr0/udb/src/output/db/udb/UdbRecordFormatter.ts` - Update formatting

## Tools and Dependencies

- Node.js (already available)
- uDb package: `@rr0/udb` (already installed)
- Analysis libraries (if needed):
  - `lodash` for data manipulation
  - `chalk` for colored console output
  - `fs-extra` for file operations

## Next Steps for AI Agent

1. **Start with data extraction**: Create `scripts/extract-refindex-data.js`
2. **Run statistical analysis**: Identify patterns and outliers
3. **Test encoding schemes**: Systematically test bit field and packed formats
4. **Validate findings**: Cross-reference with known data
5. **Implement solution**: Create decoder and integrate into codebase
6. **Test thoroughly**: Validate against all records

## Notes

- The original MS-DOS software may have used different encoding for different source types
- Some sources may only need page numbers (single-volume books)
- Periodicals likely need volume + issue + page
- Special references (93, 96, 97, 98) may use `refIndex` differently (currently as direct index)
- Consider that `refIndexHigh` being stored in the day field suggests it was a space-saving measure

## References

- [RR0/uDb GitHub Repository](https://github.com/RR0/uDb)
- uDb source code: `node_modules/@rr0/udb/dist/input/db/udb/`
- Sources file: `node_modules/@rr0/udb/data/udb/input/usources.txt`
- Database file: `node_modules/@rr0/udb/data/udb/input/U.RND`
- Original documentation: `node_modules/@rr0/udb/data/udb/input/README_u.md`
