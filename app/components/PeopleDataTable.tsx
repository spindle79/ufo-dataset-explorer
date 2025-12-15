"use client";

import DataTable from "./DataTable";
import { getPeopleTableConfig } from "@/lib/people-table-config";

interface PeopleDataTableProps {
  initialLimit?: number;
}

export default function PeopleDataTable({
  initialLimit = 50,
}: PeopleDataTableProps) {
  const config = getPeopleTableConfig(initialLimit);
  return <DataTable config={config} />;
}
