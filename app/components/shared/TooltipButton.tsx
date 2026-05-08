"use client";

import React from "react";
import Tooltip from "./Tooltip";

interface TooltipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltipId: string;
  tooltipContent: string;
  tooltipHtml?: boolean;
  tooltipPlace?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export default function TooltipButton({
  tooltipId,
  tooltipContent,
  tooltipHtml = false,
  tooltipPlace = "top",
  children,
  ...buttonProps
}: TooltipButtonProps) {
  return (
    <Tooltip
      id={tooltipId}
      content={tooltipContent}
      html={tooltipHtml}
      place={tooltipPlace}
    >
      <button {...buttonProps}>{children}</button>
    </Tooltip>
  );
}

