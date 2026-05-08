"use client";

import React from "react";
import { CheckCircle } from "lucide-react";
import TooltipButton from "./TooltipButton";

interface IncludeButtonProps {
  onClick: () => void;
  id: string;
}

export default function IncludeButton({ onClick, id }: IncludeButtonProps) {
  return (
    <TooltipButton
      tooltipId={`include-${id}`}
      tooltipContent="Include in <b>table view</b>"
      tooltipHtml
      onClick={onClick}
      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
    >
      <CheckCircle className="w-5 h-5" />
    </TooltipButton>
  );
}

