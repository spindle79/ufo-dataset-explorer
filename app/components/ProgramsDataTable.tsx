"use client";

import DataTable from "./DataTable";
import { getProgramsTableConfig } from "@/lib/programs-table-config";
import type { SourceType } from "@/lib/entity-relationships";

interface ProgramsDataTableProps {
  initialLimit?: number;
  sourceType?: SourceType;
  sourceId?: string;
}

export default function ProgramsDataTable({
  initialLimit = 50,
  sourceType,
  sourceId,
}: ProgramsDataTableProps) {
  const config = getProgramsTableConfig(initialLimit, sourceType, sourceId);
  return <DataTable config={config} />;
}
