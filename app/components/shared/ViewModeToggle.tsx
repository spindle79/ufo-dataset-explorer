"use client";

import React from "react";
import { List, LayoutGrid, Maximize2 } from "lucide-react";
import TooltipButton from "./TooltipButton";

export type ViewMode = "condensed" | "normal" | "expanded";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  idPrefix?: string;
}

export default function ViewModeToggle({
  viewMode,
  onViewModeChange,
  idPrefix = "view-mode",
}: ViewModeToggleProps) {
  const modes: Array<{
    mode: ViewMode;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }> = [
    {
      mode: "condensed",
      icon: List,
      label: "condensed",
    },
    {
      mode: "normal",
      icon: LayoutGrid,
      label: "normal",
    },
    {
      mode: "expanded",
      icon: Maximize2,
      label: "expanded",
    },
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {modes.map(({ mode, icon: Icon, label }) => (
        <TooltipButton
          key={mode}
          tooltipId={`${idPrefix}-${mode}`}
          tooltipContent={`Switch to <b>${label}</b> view`}
          tooltipHtml
          onClick={() => onViewModeChange(mode)}
          className={`p-1.5 rounded transition-colors ${
            viewMode === mode
              ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <Icon className="w-4 h-4" />
        </TooltipButton>
      ))}
    </div>
  );
}

