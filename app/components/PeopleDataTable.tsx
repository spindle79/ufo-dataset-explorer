"use client";

import DataTable from "./DataTable";
import { getPeopleTableConfig } from "@/lib/people-table-config";
import type { SourceType } from "@/lib/entity-relationships";

interface PeopleDataTableProps {
  initialLimit?: number;
  sourceType?: SourceType;
  sourceId?: string;
}

export default function PeopleDataTable({
  initialLimit = 50,
  sourceType,
  sourceId,
}: PeopleDataTableProps) {
  const config = getPeopleTableConfig(initialLimit, sourceType, sourceId);
  return <DataTable config={config} />;
}
