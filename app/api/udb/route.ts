import { NextRequest, NextResponse } from "next/server";
import {
  queryUDb,
  getUDbRecordById,
  isUDbAvailable,
  UDbQueryOptions,
} from "@/lib/udb";

/**
 * GET /api/udb
 *
 * Query the uDb (Larry Hatch UFO database) database
 *
 * Query Parameters:
 * - database: 'udb' or 'nuforc' (default: 'udb')
 * - source: Path to U.RND file (optional, defaults to ./input/db/udb/data/U.RND)
 * - match: Match criteria in format "field=value&field=value" or "field=value|field=value"
 *   Examples:
 *   - "year=1972&month=8&day=12" (AND conditions)
 *   - "id=256|id=12" (OR conditions)
 * - maxCount: Maximum number of records (default: 100, max: 1000)
 * - firstIndex: Starting record index, 1-based (default: 1)
 * - format: Output format - 'json', 'csv', 'xml', 'default' (default: 'json')
 * - allowEmpty: Allow empty results (default: false)
 * - id: Get a single record by ID (alternative to match)
 *
 * Examples:
 * - GET /api/udb?match=year=1972&month=8&maxCount=10
 * - GET /api/udb?id=256
 * - GET /api/udb?database=nuforc&match=year=2020&maxCount=50
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Check if requesting a single record by ID
    const idParam = searchParams.get("id");
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (isNaN(id) || id < 1) {
        return NextResponse.json(
          {
            error: "Invalid parameter",
            message: "id must be a positive integer",
          },
          { status: 400 }
        );
      }

      const options: Omit<UDbQueryOptions, "match" | "maxCount"> = {
        database: (searchParams.get("database") as "udb" | "nuforc") || "udb",
        source: searchParams.get("source") || undefined,
        format: (searchParams.get("format") as any) || "json",
      };

      const record = await getUDbRecordById(id, options);

      if (!record) {
        return NextResponse.json(
          {
            error: "Not found",
            message: `Record with id ${id} not found`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        record,
        count: 1,
      });
    }

    // Parse query options
    const maxCountParam = searchParams.get("maxCount");
    const maxCount = maxCountParam ? parseInt(maxCountParam, 10) : 100;

    if (maxCount < 1 || maxCount > 1000) {
      return NextResponse.json(
        {
          error: "Invalid parameter",
          message: "maxCount must be between 1 and 1000",
        },
        { status: 400 }
      );
    }

    const firstIndexParam = searchParams.get("firstIndex");
    const firstIndex = firstIndexParam ? parseInt(firstIndexParam, 10) : 1;

    if (firstIndex < 1) {
      return NextResponse.json(
        {
          error: "Invalid parameter",
          message: "firstIndex must be >= 1",
        },
        { status: 400 }
      );
    }

    const options: UDbQueryOptions = {
      database: (searchParams.get("database") as "udb" | "nuforc") || "udb",
      source: searchParams.get("source") || undefined,
      match: searchParams.get("match") || undefined,
      maxCount,
      firstIndex,
      format: (searchParams.get("format") as any) || "json",
      allowEmpty: searchParams.get("allowEmpty") === "true",
    };

    // Check if database is available
    const available = await isUDbAvailable(options.database, options.source);

    if (!available && options.database === "udb") {
      return NextResponse.json(
        {
          error: "Database not available",
          message:
            "UDB database file not found. Please ensure the database file is available at the specified path.",
          hint: options.source || "./input/db/udb/data/U.RND",
        },
        { status: 503 }
      );
    }

    const result = await queryUDb(options);

    return NextResponse.json({
      records: result.records,
      count: result.count,
      format: result.format,
      query: options,
    });
  } catch (error) {
    console.error("Error querying uDb:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to query uDb database",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/udb
 *
 * Query the uDb database with a JSON body
 *
 * Body:
 * {
 *   "database": "udb" | "nuforc",
 *   "source": "path/to/U.RND",
 *   "match": "field=value&field=value",
 *   "maxCount": 100,
 *   "firstIndex": 1,
 *   "format": "json" | "csv" | "xml" | "default",
 *   "allowEmpty": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const options: UDbQueryOptions = {
      database: body.database || "udb",
      source: body.source,
      match: body.match,
      maxCount: body.maxCount || 100,
      firstIndex: body.firstIndex || 1,
      format: body.format || "json",
      allowEmpty: body.allowEmpty || false,
    };

    // Validate maxCount
    if (options.maxCount && (options.maxCount < 1 || options.maxCount > 1000)) {
      return NextResponse.json(
        {
          error: "Invalid parameter",
          message: "maxCount must be between 1 and 1000",
        },
        { status: 400 }
      );
    }

    // Check if database is available
    const available = await isUDbAvailable(options.database!, options.source);

    if (!available && options.database === "udb") {
      return NextResponse.json(
        {
          error: "Database not available",
          message:
            "UDB database file not found. Please ensure the database file is available at the specified path.",
          hint: options.source || "./input/db/udb/data/U.RND",
        },
        { status: 503 }
      );
    }

    const result = await queryUDb(options);

    return NextResponse.json({
      records: result.records,
      count: result.count,
      format: result.format,
      query: options,
    });
  } catch (error) {
    console.error("Error querying uDb:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to query uDb database",
      },
      { status: 500 }
    );
  }
}
