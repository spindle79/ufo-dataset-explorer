"use client";

import ProgramsDataTable from "./ProgramsDataTable";

export default function ProgramsExplorer() {
  return (
    <div className="space-y-6">
      <ProgramsDataTable initialLimit={50} />
    </div>
  );
}
