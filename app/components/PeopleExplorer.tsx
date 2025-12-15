"use client";

import PeopleDataTable from "./PeopleDataTable";

export default function PeopleExplorer() {
  return (
    <div className="space-y-6">
      <PeopleDataTable initialLimit={50} />
    </div>
  );
}
