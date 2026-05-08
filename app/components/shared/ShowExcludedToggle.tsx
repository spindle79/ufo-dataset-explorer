"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";
import TooltipButton from "./TooltipButton";

interface ShowExcludedToggleProps {
  showExcluded: boolean;
  onToggle: () => void;
  idPrefix?: string;
}

export default function ShowExcludedToggle({
  showExcluded,
  onToggle,
  idPrefix = "show-excluded-toggle",
}: ShowExcludedToggleProps) {
  return (
    <TooltipButton
      tooltipId={idPrefix}
      tooltipContent={
        showExcluded ? "Hide <u>excluded</u> items" : "Show <u>excluded</u> items"
      }
      tooltipHtml
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        showExcluded
          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {showExcluded ? (
        <>
          <EyeOff className="w-4 h-4" />
          Hide Excluded
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          Show Excluded
        </>
      )}
    </TooltipButton>
  );
}

