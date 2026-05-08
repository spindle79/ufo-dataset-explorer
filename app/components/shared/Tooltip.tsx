"use client";

import React from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

interface TooltipProps {
  id: string;
  content: string;
  html?: boolean;
  children: React.ReactNode;
  place?: "top" | "bottom" | "left" | "right";
  delayShow?: number;
  delayHide?: number;
}

export default function Tooltip({
  id,
  content,
  html = false,
  children,
  place = "top",
  delayShow = 200,
  delayHide = 0,
}: TooltipProps) {
  return (
    <>
      <div 
        data-tooltip-id={id} 
        data-tooltip-html={html ? content : undefined} 
        data-tooltip-content={!html ? content : undefined}
        className="inline-block"
      >
        {children}
      </div>
      <ReactTooltip
        id={id}
        place={place}
        delayShow={delayShow}
        delayHide={delayHide}
        className="!z-[9999] !text-sm !px-3 !py-2 !rounded-md !shadow-lg !max-w-xs !bg-gray-900 dark:!bg-gray-700 !text-white dark:!text-gray-100"
      />
    </>
  );
}

