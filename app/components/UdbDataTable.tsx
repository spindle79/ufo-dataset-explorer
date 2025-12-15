'use client';

import DataTable from './DataTable';
import { getUdbTableConfig } from '@/lib/udb-table-config';

interface UdbDataTableProps {
  initialLimit?: number;
}

export default function UdbDataTable({ initialLimit = 50 }: UdbDataTableProps) {
  const config = getUdbTableConfig(initialLimit);
  return <DataTable config={config} />;
}
