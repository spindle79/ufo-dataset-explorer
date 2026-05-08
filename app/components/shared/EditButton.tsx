"use client";

import React from "react";
import { Edit } from "lucide-react";
import IconActionButton from "./IconActionButton";

interface EditButtonProps {
  onClick: () => void;
  id: string;
  itemType?: string; // "image", "video", "audio", "pdf", etc.
}

export default function EditButton({
  onClick,
  id,
  itemType = "item",
}: EditButtonProps) {
  return (
    <IconActionButton
      icon={Edit}
      tooltipId={`edit-${id}`}
      tooltipContent={`Edit ${itemType} <b>metadata</b>`}
      tooltipHtml
      onClick={onClick}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
    />
  );
}

