"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ImageFile } from "../../lib/image-types";
import ViewModeToggle, {
  ViewMode as ViewModeType,
} from "../shared/ViewModeToggle";
import ViewerHeader from "../shared/ViewerHeader";
import FileTable from "../shared/FileTable";
import { getImageTableConfig } from "../../lib/image-table-config";

type ViewMode = ViewModeType;

interface ImageViewerProps {
  filterIds?: string[];
  defaultViewMode?: ViewMode;
}

export default function ImageViewer({
  filterIds,
  defaultViewMode = "normal",
}: ImageViewerProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [showExcluded, setShowExcluded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Update CSS variables when viewMode changes (no reload needed)
  // Set on document.documentElement so they inherit to all elements (like AG Grid example)
  // https://www.ag-grid.com/javascript-data-grid/theming-compactness/
  // React.useEffect(() => {
  //   // Set data-view-mode on grid element if it exists
  //   const gridElement = document.querySelector(
  //     ".ag-theme-file-table"
  //   ) as HTMLElement;
  //   if (gridElement) {
  //     gridElement.setAttribute("data-view-mode", viewMode);
  //   }

  //   // Set CSS variables on document root - they'll inherit to AG Grid
  //   // This matches the AG Grid example: document.documentElement.style.setProperty("--ag-spacing", `${value}px`)
  //   switch (viewMode) {
  //     case "condensed":
  //       document.documentElement.style.setProperty("--ag-spacing", "4px");
  //       document.documentElement.style.setProperty(
  //         "--ag-row-vertical-padding-scale",
  //         "0.5"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-header-vertical-padding-scale",
  //         "0.5"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-cell-horizontal-padding",
  //         "8px"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-cell-vertical-padding",
  //         "4px"
  //       );
  //       break;
  //     case "normal":
  //       document.documentElement.style.setProperty("--ag-spacing", "8px");
  //       document.documentElement.style.setProperty(
  //         "--ag-row-vertical-padding-scale",
  //         "1"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-header-vertical-padding-scale",
  //         "1"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-cell-horizontal-padding",
  //         "20px"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-cell-vertical-padding",
  //         "20px"
  //       );
  //       break;
  //     case "expanded":
  //       document.documentElement.style.setProperty("--ag-spacing", "8px");
  //       document.documentElement.style.setProperty(
  //         "--ag-row-vertical-padding-scale",
  //         "1"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-header-vertical-padding-scale",
  //         "1"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-cell-horizontal-padding",
  //         "20px"
  //       );
  //       document.documentElement.style.setProperty(
  //         "--ag-cell-vertical-padding",
  //         "20px"
  //       );
  //       break;
  //   }
  // }, [viewMode]);

  // Memoize tableConfig - viewMode is handled via CSS variables, so it doesn't need to be in dependencies
  // Use 'normal' as default since viewMode only affects CSS, not config logic
  const tableConfig = useMemo(
    () =>
      getImageTableConfig(
        50,
        showExcluded,
        filterIds,
        "normal", // Always use 'normal' - viewMode is handled via CSS variables
        handleRefresh
      ),
    [showExcluded, filterIds, handleRefresh] // Exclude viewMode - handled via CSS
  );

  return (
    <div className="w-full">
      <ViewerHeader
        title="Image Files"
        count={0} // FileTable will handle this
        showExcluded={showExcluded}
        onToggleExcluded={() => {
          setShowExcluded(!showExcluded);
          handleRefresh();
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterIds={filterIds}
        idPrefix="image"
      />

      <FileTable config={tableConfig} />
    </div>
  );
}
