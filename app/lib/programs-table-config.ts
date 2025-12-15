import type { ColumnDefinition, DataTableConfig } from "@/components/DataTable";
import type { FilterRule } from "@/components/UdbQueryBuilder";
import type { Programs } from "@/lib/supabase-types";

// Programs Column Definitions
export const programsColumns: ColumnDefinition[] = [
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
    key: "description",
    label: "Description",
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

// Format cell value for Programs records
export function formatProgramsCellValue(
  record: Programs,
  columnKey: string
): string {
  switch (columnKey) {
    case "name":
      return record.name || "";
    case "aliases":
      return Array.isArray(record.aliases) ? record.aliases.join(", ") : "";
    case "description":
      return record.description || "";
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

export interface ProgramsResponse {
  records: Programs[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Fetch function for Programs data
export async function fetchProgramsData(params: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filters: FilterRule[];
}): Promise<ProgramsResponse> {
  const searchParams = new URLSearchParams({
    limit: params.limit.toString(),
    offset: params.offset.toString(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const response = await fetch(
    `/api/entities/programs?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch programs records");
  }

  const data = await response.json();
  const programs = data.programs || [];

  // For now, return all records (we'll add pagination to API later)
  return {
    records: programs.slice(params.offset, params.offset + params.limit),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: programs.length,
      hasMore: params.offset + params.limit < programs.length,
    },
  };
}

// Get Programs table configuration
export function getProgramsTableConfig(
  initialLimit = 50
): DataTableConfig<Programs> {
  return {
    columns: programsColumns,
    filterConfig: {
      fieldMapping: {
        name: "name",
        description: "description",
      },
      specialFields: {},
    },
    fetchData: fetchProgramsData,
    getRecordId: (record) => record.id,
    formatCellValue: formatProgramsCellValue,
    initialLimit,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    enableFilters: true,
  };
}
