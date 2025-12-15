"use client";

import React from "react";

interface PdfViewerProps {
  src: string;
  title?: string;
  height?: string;
  className?: string;
  showTitle?: boolean;
  showBorder?: boolean;
}

export default function PdfViewer({
  src,
  title,
  height = "600px",
  className = "",
  showTitle = true,
  showBorder = true,
}: PdfViewerProps) {
  const containerClasses = showBorder
    ? `border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900 ${className}`
    : className;

  return (
    <div className={containerClasses}>
      {showTitle && title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <iframe
        src={src}
        className="w-full border border-gray-300 dark:border-gray-600 rounded"
        style={{ height }}
        title={title || "PDF Viewer"}
      />
    </div>
  );
}
