"use client";

import DataTable from "./DataTable";
import { getLocationsTableConfig } from "@/lib/locations-table-config";
import type { SourceType } from "@/lib/entity-relationships";

interface LocationsDataTableProps {
  initialLimit?: number;
  sourceType?: SourceType;
  sourceId?: string;
}

export default function LocationsDataTable({
  initialLimit = 50,
  sourceType,
  sourceId,
}: LocationsDataTableProps) {
  const config = getLocationsTableConfig(initialLimit, sourceType, sourceId);
  return <DataTable config={config} />;
}
