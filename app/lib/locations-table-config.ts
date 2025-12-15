import type { ColumnDefinition, DataTableConfig } from "@/components/DataTable";
import type { FilterRule } from "@/components/UdbQueryBuilder";
import type { Locations } from "@/lib/supabase-types";

// Locations Column Definitions
export const locationsColumns: ColumnDefinition[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    type: "text",
    defaultVisible: true,
  },
  {
    key: "aliases",
    label: "Aliases",
    sortable: false,
    type: "text",
    defaultVisible: true,
  },
  {
    key: "city",
    label: "City",
    sortable: true,
    type: "text",
    defaultVisible: true,
  },
  {
    key: "state",
    label: "State",
    sortable: true,
    type: "text",
    defaultVisible: true,
  },
  {
    key: "country",
    label: "Country",
    sortable: true,
    type: "text",
    defaultVisible: true,
  },
  {
    key: "latitude",
    label: "Latitude",
    sortable: true,
    type: "number",
    defaultVisible: false,
  },
  {
    key: "longitude",
    label: "Longitude",
    sortable: true,
    type: "number",
    defaultVisible: false,
  },
  {
    key: "address",
    label: "Address",
    sortable: false,
    type: "text",
    defaultVisible: false,
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    type: "date",
    defaultVisible: false,
  },
  {
    key: "updated_at",
    label: "Updated",
    sortable: true,
    type: "date",
    defaultVisible: false,
  },
];

// Format cell value for Locations records
export function formatLocationsCellValue(
  record: Locations,
  columnKey: string
): string {
  switch (columnKey) {
    case "name":
      return record.name || "";
    case "aliases":
      return Array.isArray(record.aliases) ? record.aliases.join(", ") : "";
    case "city":
      return record.city || "";
    case "state":
      return record.state || "";
    case "country":
      return record.country || "";
    case "latitude":
      return record.latitude?.toString() || "";
    case "longitude":
      return record.longitude?.toString() || "";
    case "address":
      return record.address || "";
    case "created_at":
      return record.created_at
        ? new Date(record.created_at).toLocaleDateString()
        : "";
    case "updated_at":
      return record.updated_at
        ? new Date(record.updated_at).toLocaleDateString()
        : "";
    default:
      return "";
  }
}

export interface LocationsResponse {
  records: Locations[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Fetch function for Locations data
export async function fetchLocationsData(params: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filters: FilterRule[];
}): Promise<LocationsResponse> {
  const searchParams = new URLSearchParams({
    limit: params.limit.toString(),
    offset: params.offset.toString(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const response = await fetch(
    `/api/entities/locations?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch locations records");
  }

  const data = await response.json();
  const locations = data.locations || [];

  // For now, return all records (we'll add pagination to API later)
  return {
    records: locations.slice(params.offset, params.offset + params.limit),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: locations.length,
      hasMore: params.offset + params.limit < locations.length,
    },
  };
}

// Get Locations table configuration
export function getLocationsTableConfig(
  initialLimit = 50
): DataTableConfig<Locations> {
  return {
    columns: locationsColumns,
    filterConfig: {
      fieldMapping: {
        name: "name",
        city: "city",
        state: "state",
        country: "country",
      },
      specialFields: {},
    },
    fetchData: fetchLocationsData,
    getRecordId: (record) => record.id,
    formatCellValue: formatLocationsCellValue,
    initialLimit,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    enableFilters: true,
  };
}
