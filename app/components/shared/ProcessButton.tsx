"use client";

import React from "react";
import { Plus, Loader2 } from "lucide-react";
import TooltipButton from "./TooltipButton";

interface ProcessButtonProps {
  onClick: () => void;
  id: string;
  disabled?: boolean;
  itemType?: string; // "image", "video", "audio", "pdf", etc.
}

export default function ProcessButton({
  onClick,
  id,
  disabled = false,
  itemType = "file",
}: ProcessButtonProps) {
  return (
    <TooltipButton
      tooltipId={`process-${id}`}
      tooltipContent={`Process and <u>download</u> ${itemType} from source`}
      tooltipHtml
      onClick={onClick}
      disabled={disabled}
      className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {disabled ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Plus className="w-5 h-5" />
      )}
    </TooltipButton>
  );
}

