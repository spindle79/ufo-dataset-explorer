"use client";

import DataTable from "./DataTable";
import { getCompaniesTableConfig } from "@/lib/companies-table-config";
import type { SourceType } from "@/lib/entity-relationships";

interface CompaniesDataTableProps {
  initialLimit?: number;
  sourceType?: SourceType;
  sourceId?: string;
}

export default function CompaniesDataTable({
  initialLimit = 50,
  sourceType,
  sourceId,
}: CompaniesDataTableProps) {
  const config = getCompaniesTableConfig(initialLimit, sourceType, sourceId);
  return <DataTable config={config} />;
}

