'use client';

import UdbDataTable from './UdbDataTable';

export default function UdbExplorer() {
  return (
    <div className="space-y-6">
      <UdbDataTable initialLimit={50} />
    </div>
  );
}

