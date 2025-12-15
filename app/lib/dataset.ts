import { loadHuggingFaceDataset } from "./huggingface";
import { getDataAccess, type DataAccess } from "./data-access";

export interface UFOSighting {
  uid: string;
  t_utc: string;
  lat: number;
  lon: number;
  text: string;
  src: string;
  city?: string;
  state?: string;
  country?: string;
  cluster_id?: number;
  prob?: number;
  moon_illum?: number;
  moon_alt_deg?: number;
  nearest_airport_km?: number;
  nearest_airport_code?: string;
  wx_bucket?: string;
  reports_z?: number | null;
}

export interface DatasetQuery {
  limit?: number;
  offset?: number;
  state?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  latMin?: number;
  latMax?: number;
  lonMin?: number;
  lonMax?: number;
  clusterId?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface DatasetResponse {
  data: UFOSighting[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Export for use in API routes
export { loadHuggingFaceDataset } from "./huggingface";

/**
 * Load all records from filesystem or Hugging Face API
 * Uses data access abstraction layer
 */
export async function loadLocalDataset(): Promise<UFOSighting[]> {
  const dataAccess = getDataAccess();
  const isAvailable = await dataAccess.isAvailable();

  if (!isAvailable) {
    return [];
  }

  const records: UFOSighting[] = [];
  for await (const record of dataAccess.getAll()) {
    records.push(record);
  }
  return records;
}

/**
 * Stream dataset from filesystem (for large datasets)
 * Uses data access abstraction layer
 */
export async function* streamLocalDataset(): AsyncGenerator<
  UFOSighting,
  void,
  unknown
> {
  const dataAccess = getDataAccess();
  const isAvailable = await dataAccess.isAvailable();

  if (!isAvailable) {
    return;
  }

  yield* dataAccess.getAll();
}

/**
 * Query dataset with filters, pagination, and sorting
 * Uses data access abstraction layer, falls back to Hugging Face API
 */
export async function queryDataset(
  query: DatasetQuery
): Promise<DatasetResponse> {
  const limit = Math.min(query.limit || 50, 1000);
  const offset = query.offset || 0;
  const sortBy = query.sortBy || "t_utc";
  const sortOrder = query.sortOrder || "desc";

  const dataAccess = getDataAccess();
  const isAvailable = await dataAccess.isAvailable();

  let allRecords: UFOSighting[] = [];

  if (isAvailable) {
    // Use filesystem data access
    const filters: Record<string, any> = {};
    if (query.state) filters.state = query.state;
    if (query.country) filters.country = query.country;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;
    if (query.latMin !== undefined) filters.latMin = query.latMin;
    if (query.latMax !== undefined) filters.latMax = query.latMax;
    if (query.lonMin !== undefined) filters.lonMin = query.lonMin;
    if (query.lonMax !== undefined) filters.lonMax = query.lonMax;
    if (query.clusterId !== undefined) filters.clusterId = query.clusterId;
    if (query.search) filters.search = query.search;

    for await (const record of dataAccess.getAll(filters)) {
      allRecords.push(record);
    }
  } else {
    // Fallback to Hugging Face API
    const dataset = await loadHuggingFaceDataset();
    allRecords = (await dataset.toArray()) as UFOSighting[];

    // Apply filters (since data access layer handles this for filesystem)
    if (query.state) {
      allRecords = allRecords.filter(
        (r) => r.state?.toLowerCase() === query.state?.toLowerCase()
      );
    }

    if (query.country) {
      allRecords = allRecords.filter(
        (r) => r.country?.toLowerCase() === query.country?.toLowerCase()
      );
    }

    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);
      allRecords = allRecords.filter((r) => new Date(r.t_utc) >= fromDate);
    }

    if (query.dateTo) {
      const toDate = new Date(query.dateTo);
      allRecords = allRecords.filter((r) => new Date(r.t_utc) <= toDate);
    }

    if (query.latMin !== undefined) {
      allRecords = allRecords.filter((r) => r.lat >= query.latMin!);
    }

    if (query.latMax !== undefined) {
      allRecords = allRecords.filter((r) => r.lat <= query.latMax!);
    }

    if (query.lonMin !== undefined) {
      allRecords = allRecords.filter((r) => r.lon >= query.lonMin!);
    }

    if (query.lonMax !== undefined) {
      allRecords = allRecords.filter((r) => r.lon <= query.lonMax!);
    }

    if (query.clusterId !== undefined) {
      allRecords = allRecords.filter((r) => r.cluster_id === query.clusterId);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      allRecords = allRecords.filter(
        (r) =>
          r.text?.toLowerCase().includes(searchLower) ||
          r.city?.toLowerCase().includes(searchLower) ||
          r.state?.toLowerCase().includes(searchLower)
      );
    }
  }

  // Sort
  allRecords.sort((a, b) => {
    const aVal = a[sortBy as keyof UFOSighting];
    const bVal = b[sortBy as keyof UFOSighting];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  // Paginate
  const paginated = allRecords.slice(offset, offset + limit);
  const hasMore = offset + limit < allRecords.length;

  return {
    data: paginated,
    pagination: {
      limit,
      offset,
      total: allRecords.length,
      hasMore,
    },
  };
}

/**
 * Stream dataset with filters (for large result sets)
 * Uses data access abstraction layer, falls back to Hugging Face API
 */
export async function* streamDataset(
  query: DatasetQuery
): AsyncGenerator<UFOSighting, void, unknown> {
  const dataAccess = getDataAccess();
  const isAvailable = await dataAccess.isAvailable();

  if (isAvailable) {
    // Use filesystem data access
    const filters: Record<string, any> = {};
    if (query.state) filters.state = query.state;
    if (query.country) filters.country = query.country;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;
    if (query.latMin !== undefined) filters.latMin = query.latMin;
    if (query.latMax !== undefined) filters.latMax = query.latMax;
    if (query.lonMin !== undefined) filters.lonMin = query.lonMin;
    if (query.lonMax !== undefined) filters.lonMax = query.lonMax;
    if (query.clusterId !== undefined) filters.clusterId = query.clusterId;
    if (query.search) filters.search = query.search;

    yield* dataAccess.getAll(filters);
  } else {
    // Fallback to Hugging Face API
    const dataset = await loadHuggingFaceDataset();
    const records = (await dataset.toArray()) as UFOSighting[];

    for (const record of records) {
      // Apply filters
      if (
        query.state &&
        record.state?.toLowerCase() !== query.state.toLowerCase()
      ) {
        continue;
      }
      if (
        query.country &&
        record.country?.toLowerCase() !== query.country.toLowerCase()
      ) {
        continue;
      }
      if (
        query.clusterId !== undefined &&
        record.cluster_id !== query.clusterId
      ) {
        continue;
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        if (
          !record.text?.toLowerCase().includes(searchLower) &&
          !record.city?.toLowerCase().includes(searchLower) &&
          !record.state?.toLowerCase().includes(searchLower)
        ) {
          continue;
        }
      }
      yield record;
    }
  }
}
