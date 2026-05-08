"use client";

import React from "react";
import type { FileTableColumn, FileTableConfig } from "@/components/shared/FileTable";
import type { ImageFile } from "@/lib/image-types";
import { decodeFileName } from "@/lib/utils";
import { formatDate } from "@/lib/file-operations";
import { Image as ImageIcon } from "lucide-react";
import ImageThumbnail from "@/components/image/ImageThumbnail";
import ImageStatusBadge from "@/components/image/ImageStatusBadge";
import ImageActionButtons from "@/components/image/ImageActionButtons";

// Image Column Definitions
export const imageColumns: FileTableColumn<ImageFile>[] = [
  {
    key: "thumbnail",
    label: "Thumbnail",
    sortable: false,
    width: 120,
    cellRenderer: (params: any) => {
      if (!params.data) return null;
      return <ImageThumbnail file={params.data} />;
    },
  },
  {
    key: "fileName",
    label: "File Name",
    sortable: true,
    width: 300,
    cellRenderer: (params: any) => {
      if (!params.data) return null;
      return (
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {decodeFileName(params.data.fileName)}
          </span>
        </div>
      );
    },
  },
  {
    key: "uploadedDate",
    label: "Uploaded Date",
    sortable: true,
    width: 200,
    cellRenderer: (params: any) => {
      if (!params.data) return null;
      return (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(params.data.uploadedDate)}
        </span>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: false,
    width: 150,
    cellRenderer: (params: any) => {
      if (!params.data) return null;
      return <ImageStatusBadge file={params.data} />;
    },
  },
  {
    key: "actions",
    label: "Actions",
    sortable: false,
    width: 400,
    cellRenderer: (params: any) => {
      if (!params.data) return null;
      return <ImageActionButtons file={params.data} />;
    },
  },
];

// Get Image table configuration
export function getImageTableConfig(
  initialLimit = 50,
  showExcluded = false,
  filterIds?: string[],
  viewMode: 'normal' | 'expanded' = 'normal',
  onRefresh?: () => Promise<void>
): FileTableConfig<ImageFile> {
  return {
    columns: imageColumns,
    fetchData: async () => {
      const response = await fetch("/api/image");
      if (!response.ok) {
        throw new Error("Failed to fetch image files");
      }
      return response.json();
    },
    getRecordId: (record) => record.id,
    initialLimit,
    defaultSortBy: "uploadedDate",
    defaultSortOrder: "desc",
    showExcluded,
    filterIds,
    viewMode,
    renderExpandedContent: (file) => (
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Description:
          </span>
          <p className="text-gray-700 dark:text-gray-300">
            {file.description || "—"}
          </p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Original URL:
          </span>
          {file.originalUrl ? (
            <a
              href={file.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {file.originalUrl}
            </a>
          ) : (
            <span className="text-gray-400">Manually Uploaded</span>
          )}
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Categories:
          </span>
          <div className="flex flex-wrap gap-1">
            {file.categories.length > 0 ? (
              file.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                >
                  {cat}
                </span>
              ))
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
        {file.status !== "discovered" && (
          <div className="col-span-3 mt-4">
            <img
              src={`/api/image/${file.id}/file`}
              alt={file.fileName}
              className="max-w-md max-h-64 object-contain rounded border border-gray-300 dark:border-gray-600"
            />
          </div>
        )}
      </div>
    ),
  };
}

