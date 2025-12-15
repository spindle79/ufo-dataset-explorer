"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageFile } from "../../lib/image-types";
import { decodeFileName } from "../../lib/utils";
import {
  Loader2,
  Download,
  Edit,
  Eye,
  LayoutGrid,
  List,
  Maximize2,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  ChevronUp,
  ChevronDown,
  Minus,
  Image as ImageIcon,
  Cloud,
  HardDrive,
  Ban,
} from "lucide-react";

type SortField = "fileName" | "uploadedDate" | "description";
type SortOrder = "asc" | "desc";
type ViewMode = "condensed" | "normal" | "expanded";

interface ImageViewerProps {
  filterIds?: string[];
  defaultViewMode?: ViewMode;
}

/**
 * Helper function to check if a file is URL-only (not downloaded)
 */
function isUrlOnlyFile(file: ImageFile): boolean {
  // Check if file_path is a placeholder path (starts with "discovered/")
  // OR if file_size is null/0 and originalUrl exists
  return (
    file.filePath.startsWith("discovered/") ||
    ((file.fileSize == null || file.fileSize === 0) && file.originalUrl != null)
  );
}

/**
 * Thumbnail Component
 * Displays a clickable thumbnail image with fallback
 */
function Thumbnail({
  fileId,
  fileName,
  onClick,
  status,
}: {
  fileId: string;
  fileName: string;
  onClick: () => void;
  status: "discovered" | "pending" | "processing" | "parsed" | "error";
}) {
  const [imageError, setImageError] = useState(false);

  if (status === "discovered" || imageError) {
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="block relative group"
      title="Click to view details"
    >
      <img
        src={`/api/image/${fileId}/file`}
        alt={decodeFileName(fileName)}
        className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        onError={() => setImageError(true)}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded transition-opacity flex items-center justify-center">
        <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

/**
 * Status Badge Component
 * Displays the status of an image file with appropriate colors and icons
 */
function StatusBadge({
  status,
  file,
}: {
  status: "discovered" | "pending" | "processing" | "parsed" | "error";
  file: ImageFile;
}) {
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

export default function ImageViewer({
  filterIds,
  defaultViewMode = "normal",
}: ImageViewerProps = {}) {
  const router = useRouter();
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("uploadedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  const fetchImageFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/image");
      if (!response.ok) {
        throw new Error("Failed to fetch image files");
      }
      const data = await response.json();
      // Filter by IDs if filterIds prop is provided
      let filtered = filterIds
        ? data.filter((file: ImageFile) => filterIds.includes(file.id))
        : data;
      // Filter out excluded files
      filtered = filtered.filter(
        (file: ImageFile) => !(file as any).metadata?.excluded
      );
      setImageFiles(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load image files"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImageFiles();
  }, [filterIds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedFiles = [...imageFiles].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case "fileName":
        aVal = a.fileName.toLowerCase();
        bVal = b.fileName.toLowerCase();
        break;
      case "uploadedDate":
        aVal = new Date(a.uploadedDate).getTime();
        bVal = new Date(b.uploadedDate).getTime();
        break;
      case "description":
        aVal = (a.description || "").toLowerCase();
        bVal = (b.description || "").toLowerCase();
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleDownload = (id: string, fileName: string) => {
    const url = `/api/image/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = decodeFileName(fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExclude = async (file: ImageFile) => {
    try {
      const response = await fetch(`/api/image/${file.id}/exclude`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to exclude file");
      }

      // Refresh the image files list
      await fetchImageFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to exclude file");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <Minus className="w-4 h-4 text-gray-400" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  // Get padding classes based on view mode
  const getPaddingClasses = (type: "header" | "body") => {
    if (type === "header") {
      switch (viewMode) {
        case "condensed":
          return "px-3 py-2";
        case "normal":
          return "px-4 py-2.5";
        case "expanded":
          return "px-6 py-3";
        default:
          return "px-4 py-2.5";
      }
    } else {
      switch (viewMode) {
        case "condensed":
          return "px-3 py-2";
        case "normal":
          return "px-4 py-2.5";
        case "expanded":
          return "px-6 py-4";
        default:
          return "px-4 py-2.5";
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Loading image files...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Image Files ({imageFiles.length})
        </h3>
        {!defaultViewMode && (
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("condensed")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "condensed"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Condensed View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("normal")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "normal"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Normal View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("expanded")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "expanded"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Expanded View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {imageFiles.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No image files yet. Upload some files to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                >
                  Thumbnail
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                  onClick={() => handleSort("fileName")}
                >
                  <div className="flex items-center gap-2">
                    File Name
                    <SortIcon field="fileName" />
                  </div>
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                  onClick={() => handleSort("uploadedDate")}
                >
                  <div className="flex items-center gap-2">
                    Uploaded Date
                    <SortIcon field="uploadedDate" />
                  </div>
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                >
                  Status
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedFiles.map((file) => (
                <React.Fragment key={file.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap`}
                    >
                      <Thumbnail
                        fileId={file.id}
                        fileName={file.fileName}
                        onClick={() => router.push(`/image/${file.id}`)}
                        status={file.status}
                      />
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white`}
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        {decodeFileName(file.fileName)}
                      </div>
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm text-gray-500 dark:text-gray-400`}
                    >
                      {formatDate(file.uploadedDate)}
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm`}
                    >
                      <StatusBadge status={file.status} file={file} />
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm`}
                    >
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => router.push(`/image/${file.id}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {/* Ban/Exclude button */}
                        <button
                          onClick={() => handleExclude(file)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          title="Exclude from table"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                        {file.status !== "discovered" && (
                          <>
                            <button
                              onClick={() =>
                                handleDownload(file.id, file.fileName)
                              }
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                              title="Download"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => router.push(`/image/${file.id}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded details row - shown only in expanded mode */}
                  {viewMode === "expanded" && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={5} className={getPaddingClasses("body")}>
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
                              <span className="text-gray-400">
                                Manually Uploaded
                              </span>
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
                        </div>
                        {file.status !== "discovered" && (
                          <div className="mt-4">
                            <img
                              src={`/api/image/${file.id}/file`}
                              alt={file.fileName}
                              className="max-w-md max-h-64 object-contain rounded border border-gray-300 dark:border-gray-600"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
