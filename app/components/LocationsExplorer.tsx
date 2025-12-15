"use client";

import LocationsDataTable from "./LocationsDataTable";

export default function LocationsExplorer() {
  return (
    <div className="space-y-6">
      <LocationsDataTable initialLimit={50} />
    </div>
  );
}
