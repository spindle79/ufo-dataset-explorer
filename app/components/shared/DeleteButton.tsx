"use client";

import React from "react";
import { Trash2, Loader2 } from "lucide-react";
import TooltipButton from "./TooltipButton";

interface DeleteButtonProps {
  onClick: () => void;
  id: string;
  disabled?: boolean;
  itemType?: string; // "image", "video", "audio", "pdf", etc.
}

export default function DeleteButton({
  onClick,
  id,
  disabled = false,
  itemType = "item",
}: DeleteButtonProps) {
  return (
    <TooltipButton
      tooltipId={`delete-${id}`}
      tooltipContent={`Permanently <b>delete</b> this ${itemType}`}
      tooltipHtml
      onClick={onClick}
      disabled={disabled}
      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {disabled ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Trash2 className="w-5 h-5" />
      )}
    </TooltipButton>
  );
}

