"use client";

import React from "react";
import { Eye } from "lucide-react";
import IconActionButton from "./IconActionButton";

interface ViewDetailsButtonProps {
  onClick: () => void;
  id: string;
  itemType?: string; // "image", "video", "audio", "pdf", etc.
}

export default function ViewDetailsButton({
  onClick,
  id,
  itemType = "item",
}: ViewDetailsButtonProps) {
  return (
    <IconActionButton
      icon={Eye}
      tooltipId={`view-details-${id}`}
      tooltipContent={`View <b>${itemType} details</b> page`}
      tooltipHtml
      onClick={onClick}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
    />
  );
}

