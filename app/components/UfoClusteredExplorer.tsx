'use client';

import DataTable from './DataTable';
import { getUfoClusteredTableConfig } from '@/lib/ufo-clustered-table-config';

interface UfoClusteredExplorerProps {
  initialLimit?: number;
}

export default function UfoClusteredExplorer({ initialLimit = 50 }: UfoClusteredExplorerProps) {
  const config = getUfoClusteredTableConfig(initialLimit);
  return <DataTable config={config} />;
}

