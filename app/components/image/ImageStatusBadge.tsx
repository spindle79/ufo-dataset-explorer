"use client";

import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Cloud,
  HardDrive,
} from "lucide-react";
import { ImageFile } from "@/lib/image-types";

interface ImageStatusBadgeProps {
  file: ImageFile;
}

/**
 * Helper function to check if a file is URL-only (not downloaded)
 */
function isUrlOnlyFile(file: ImageFile): boolean {
  return (
    file.filePath.startsWith("discovered/") ||
    ((file.fileSize == null || file.fileSize === 0) && file.originalUrl != null)
  );
}

export default function ImageStatusBadge({ file }: ImageStatusBadgeProps) {
  const status = file.status;
  const statusConfig = {
    discovered: {
      label: "Discovered",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      icon: Search,
    },
    pending: {
      label: "Pending",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      icon: Clock, // Default, will be overridden if URL-only
    },
    processing: {
      label: "Processing",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      icon: Loader2,
    },
    parsed: {
      label: "Parsed",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      icon: CheckCircle,
    },
    error: {
      label: "Error",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];

  // Override icon for pending status based on whether file is URL-only
  let Icon = config.icon;
  if (status === "pending") {
    Icon = isUrlOnlyFile(file) ? Cloud : HardDrive;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {status === "processing" ? (
        <Icon className="w-3 h-3 animate-spin" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {config.label}
    </span>
  );
}

