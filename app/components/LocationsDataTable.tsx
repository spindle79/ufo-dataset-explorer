"use client";

import DataTable from "./DataTable";
import { getLocationsTableConfig } from "@/lib/locations-table-config";

interface LocationsDataTableProps {
  initialLimit?: number;
}

export default function LocationsDataTable({
  initialLimit = 50,
}: LocationsDataTableProps) {
  const config = getLocationsTableConfig(initialLimit);
  return <DataTable config={config} />;
}
