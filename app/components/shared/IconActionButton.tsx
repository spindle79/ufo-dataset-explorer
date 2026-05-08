"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import TooltipButton from "./TooltipButton";

interface IconActionButtonProps {
  icon: LucideIcon;
  tooltipId: string;
  tooltipContent: string;
  tooltipHtml?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  iconClassName?: string;
}

export default function IconActionButton({
  icon: Icon,
  tooltipId,
  tooltipContent,
  tooltipHtml = false,
  onClick,
  className = "",
  disabled = false,
  iconClassName = "w-5 h-5",
}: IconActionButtonProps) {
  return (
    <TooltipButton
      tooltipId={tooltipId}
      tooltipContent={tooltipContent}
      tooltipHtml={tooltipHtml}
      onClick={onClick}
      disabled={disabled}
      className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Icon className={iconClassName} />
    </TooltipButton>
  );
}

