"use client";

import React from "react";
import { Ban } from "lucide-react";
import IconActionButton from "./IconActionButton";

interface ExcludeButtonProps {
  onClick: () => void;
  id: string;
}

export default function ExcludeButton({ onClick, id }: ExcludeButtonProps) {
  return (
    <IconActionButton
      icon={Ban}
      tooltipId={`exclude-${id}`}
      tooltipContent="Exclude from <b>table view</b>"
      tooltipHtml
      onClick={onClick}
      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
    />
  );
}

