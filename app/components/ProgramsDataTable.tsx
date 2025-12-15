"use client";

import DataTable from "./DataTable";
import { getProgramsTableConfig } from "@/lib/programs-table-config";

interface ProgramsDataTableProps {
  initialLimit?: number;
}

export default function ProgramsDataTable({
  initialLimit = 50,
}: ProgramsDataTableProps) {
  const config = getProgramsTableConfig(initialLimit);
  return <DataTable config={config} />;
}
