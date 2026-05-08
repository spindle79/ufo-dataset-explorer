"use client";

import React from "react";
import { Download } from "lucide-react";
import IconActionButton from "./IconActionButton";

interface DownloadButtonProps {
  onClick: () => void;
  id: string;
  itemType?: string; // "image", "video", "audio", "pdf", etc.
}

export default function DownloadButton({
  onClick,
  id,
  itemType = "file",
}: DownloadButtonProps) {
  return (
    <IconActionButton
      icon={Download}
      tooltipId={`download-${id}`}
      tooltipContent={`Download <b>${itemType} file</b>`}
      tooltipHtml
      onClick={onClick}
      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
    />
  );
}

