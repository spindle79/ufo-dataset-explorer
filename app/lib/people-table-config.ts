import type { ColumnDefinition, DataTableConfig } from "@/components/DataTable";
import type { FilterRule } from "@/components/UdbQueryBuilder";
import type { People } from "@/lib/supabase-types";

// People Column Definitions
export const peopleColumns: ColumnDefinition[] = [
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

// Format cell value for People records
export function formatPeopleCellValue(
  record: People,
  columnKey: string
): string {
  switch (columnKey) {
    case "name":
      return record.name || "";
    case "aliases":
      return Array.isArray(record.aliases) ? record.aliases.join(", ") : "";
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

export interface PeopleResponse {
  records: People[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Fetch function for People data
export async function fetchPeopleData(params: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filters: FilterRule[];
}): Promise<PeopleResponse> {
  const searchParams = new URLSearchParams({
    limit: params.limit.toString(),
    offset: params.offset.toString(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const response = await fetch(
    `/api/entities/people?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch people records");
  }

  const data = await response.json();
  const people = data.people || [];

  // For now, return all records (we'll add pagination to API later)
  return {
    records: people.slice(params.offset, params.offset + params.limit),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: people.length,
      hasMore: params.offset + params.limit < people.length,
    },
  };
}

// Get People table configuration
export function getPeopleTableConfig(
  initialLimit = 50
): DataTableConfig<People> {
  return {
    columns: peopleColumns,
    filterConfig: {
      fieldMapping: {
        name: "name",
      },
      specialFields: {},
    },
    fetchData: fetchPeopleData,
    getRecordId: (record) => record.id,
    formatCellValue: formatPeopleCellValue,
    initialLimit,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    enableFilters: true,
  };
}
