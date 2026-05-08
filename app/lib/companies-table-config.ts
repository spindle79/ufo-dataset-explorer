"use client";

import React from "react";
import type { ColumnDefinition, DataTableConfig } from "@/components/DataTable";
import type { FilterRule } from "@/components/UdbQueryBuilder";
import Link from "next/link";

// Company interface (matching the structure from companies detail page)
interface Company {
  id: string;
  name: string;
  aliases: string[];
  created_at: string;
  updated_at: string;
}

// Render cell function for company name
const renderCompanyName = (value: string, record: Company) => {
  return React.createElement(
    Link,
    {
      href: `/companies/${record.id}`,
      className: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline",
    },
    value
  );
};

// Companies Column Definitions
export const companiesColumns: ColumnDefinition[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    type: "text",
    defaultVisible: true,
    renderCell: renderCompanyName,
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

// Format cell value for Companies records
export function formatCompaniesCellValue(
  record: Company,
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

export interface CompaniesResponse {
  records: Company[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Fetch function for Companies data
export async function fetchCompaniesData(params: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filters: FilterRule[];
}): Promise<CompaniesResponse> {
  const searchParams = new URLSearchParams({
    limit: params.limit.toString(),
    offset: params.offset.toString(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const response = await fetch(
    `/api/entities/companies?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch companies records");
  }

  const data = await response.json();
  const companies = data.companies || [];

  // For now, return all records (we'll add pagination to API later)
  return {
    records: companies.slice(params.offset, params.offset + params.limit),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: companies.length,
      hasMore: params.offset + params.limit < companies.length,
    },
  };
}

// Get Companies table configuration
export function getCompaniesTableConfig(
  initialLimit = 50,
  sourceType?: string,
  sourceId?: string
): DataTableConfig<Company> {
  // Create a custom fetch function if source filtering is needed
  const fetchDataFn = sourceType && sourceId
    ? async (params: {
        limit: number;
        offset: number;
        sortBy: string;
        sortOrder: "asc" | "desc";
        filters: FilterRule[];
      }): Promise<CompaniesResponse> => {
        const searchParams = new URLSearchParams({
          limit: params.limit.toString(),
          offset: params.offset.toString(),
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          source_type: sourceType,
          source_id: sourceId,
        });

        const response = await fetch(
          `/api/entities/companies?${searchParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch companies records");
        }

        const data = await response.json();
        const companies = data.companies || [];

        return {
          records: companies.slice(params.offset, params.offset + params.limit),
          pagination: {
            limit: params.limit,
            offset: params.offset,
            total: companies.length,
            hasMore: params.offset + params.limit < companies.length,
          },
        };
      }
    : fetchCompaniesData;

  return {
    columns: companiesColumns,
    filterConfig: {
      fieldMapping: {
        name: "name",
      },
      specialFields: {},
    },
    fetchData: fetchDataFn,
    getRecordId: (record) => record.id,
    formatCellValue: formatCompaniesCellValue,
    initialLimit,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    enableFilters: true,
  };
}

