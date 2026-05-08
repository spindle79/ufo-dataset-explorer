import React from "react";
import ShowExcludedToggle from "./ShowExcludedToggle";
import ViewModeToggle, { ViewMode } from "./ViewModeToggle";

interface ViewerHeaderProps {
  title: string;
  count: number;
  showExcluded: boolean;
  onToggleExcluded: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filterIds?: string[];
  idPrefix?: string;
}

export default function ViewerHeader({
  title,
  count,
  showExcluded,
  onToggleExcluded,
  viewMode,
  onViewModeChange,
  filterIds,
  idPrefix = "viewer",
}: ViewerHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold">
        {title} ({count})
      </h3>
      <div className="flex items-center gap-2">
        <ShowExcludedToggle
          showExcluded={showExcluded}
          onToggle={onToggleExcluded}
          idPrefix={`show-excluded-toggle-${idPrefix}`}
        />
        {!filterIds && (
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            idPrefix={`view-mode-${idPrefix}`}
          />
        )}
      </div>
    </div>
  );
}

