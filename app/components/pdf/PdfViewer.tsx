"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PdfFile } from "../../lib/pdf-types";
import GenerationModal, { GenerationPreview } from "../shared/GenerationModal";
import TranscriptionTable from "../shared/TranscriptionTable";
import SharedPdfViewer from "../shared/PdfViewer";
import { AiGeneration } from "../shared/GenerationViewer";
import { ServiceOption } from "../shared/ServiceSelector";
import Modal from "../shared/Modal";
import UrlUploadTab from "./UrlUploadTab";
import {
  Eye,
  Download,
  Edit,
  X,
  ChevronUp,
  ChevronDown,
  Minus,
  FileText,
  History,
  Search,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  List,
  LayoutGrid,
  Maximize2,
  Trash2,
  Cloud,
  HardDrive,
  Ban,
} from "lucide-react";

type SortField = "fileName" | "uploadedDate" | "description";
type SortOrder = "asc" | "desc";
type ViewMode = "condensed" | "normal" | "expanded";

/**
 * Helper function to check if a file is URL-only (not downloaded)
 */
function isUrlOnlyFile(file: PdfFile): boolean {
  // Check if file_path is a placeholder path (starts with "discovered/")
  // OR if file_size is null/0 and originalUrl exists
  return (
    file.filePath.startsWith("discovered/") ||
    ((file.fileSize == null || file.fileSize === 0) && file.originalUrl != null)
  );
}

/**
 * Status Badge Component
 * Displays the status of a PDF file with appropriate colors and icons
 */
function StatusBadge({
  status,
  file,
}: {
  status: "discovered" | "pending" | "processing" | "parsed" | "error";
  file: PdfFile;
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

// PDF-specific service options
const PDF_SERVICES: ServiceOption[] = [
  { key: "openai", label: "OpenAI", description: "Processed & Refined" },
  {
    key: "pdfparsenew",
    label: "PDF Parse New",
    description: "Alternative Parser",
  },
];

interface PdfViewerProps {
  filterIds?: string[];
  defaultViewMode?: ViewMode;
}

export default function PdfViewer({
  filterIds,
  defaultViewMode = "normal",
}: PdfViewerProps = {}) {
  const router = useRouter();
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("uploadedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [currentExtractions, setCurrentExtractions] = useState<
    Record<string, AiGeneration>
  >({});
  const [extractionVersions, setExtractionVersions] = useState<
    Record<string, AiGeneration[]>
  >({});
  const [showingExtractions, setShowingExtractions] = useState<string | null>(
    null
  );
  const [extractModalOpen, setExtractModalOpen] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<
    Record<string, boolean>
  >({});
  const [extractionResults, setExtractionResults] = useState<
    Record<string, GenerationPreview | null>
  >({});
  const [extractingServices, setExtractingServices] = useState<
    Record<string, boolean>
  >({});
  const [savedGenerationIds, setSavedGenerationIds] = useState<
    Record<string, string>
  >({});
  const [processingFile, setProcessingFile] = useState<PdfFile | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPdfFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pdf");
      if (!response.ok) {
        throw new Error("Failed to fetch PDF files");
      }
      const data = await response.json();
      // Filter by IDs if filterIds prop is provided
      let filtered = filterIds
        ? data.filter((file: PdfFile) => filterIds.includes(file.id))
        : data;
      // Filter out excluded files
      filtered = filtered.filter(
        (file: PdfFile) => !(file as any).metadata?.excluded
      );
      setPdfFiles(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdfFiles();
  }, [filterIds]);

  // Fetch current extractions for all PDF files
  useEffect(() => {
    const fetchCurrentExtractions = async () => {
      const extractions: Record<string, AiGeneration> = {};
      for (const file of pdfFiles) {
        if (file.currentExtractionId) {
          try {
            const response = await fetch(
              `/api/pdf/${file.id}/extraction/current`
            );
            if (response.ok) {
              const data = await response.json();
              if (data) {
                extractions[file.id] = data;
              }
            }
          } catch (err) {
            console.error(`Error fetching extraction for ${file.id}:`, err);
          }
        }
      }
      setCurrentExtractions(extractions);
    };
    fetchCurrentExtractions();
  }, [pdfFiles]);

  const fetchExtractionVersions = async (pdfId: string) => {
    try {
      // Fetch all extraction types (no type filter = all extraction generations)
      const response = await fetch(`/api/pdf/${pdfId}/generations`);
      if (response.ok) {
        const allExtractions = await response.json();
        setExtractionVersions((prev) => ({ ...prev, [pdfId]: allExtractions }));
      }
    } catch (err) {
      console.error("Error fetching extraction versions:", err);
    }
  };

  const handleProcess = (file: PdfFile) => {
    setProcessingFile(file);
    setProcessModalOpen(file.id);
  };

  const handleProcessSuccess = async () => {
    setProcessModalOpen(null);
    setProcessingFile(null);
    // Refresh the PDF files list to show updated status
    await fetchPdfFiles();
  };

  const handleExclude = async (file: PdfFile) => {
    try {
      const response = await fetch(`/api/pdf/${file.id}/exclude`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to exclude file");
      }

      // Refresh the PDF files list
      await fetchPdfFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to exclude file");
    }
  };

  const handleRunExtraction = async (
    pdfId: string,
    serviceKey: string
  ): Promise<GenerationPreview> => {
    setExtractingServices((prev) => ({ ...prev, [serviceKey]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/pdf/${pdfId}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ service: serviceKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Extraction failed");
      }

      const data = await response.json();
      const result: GenerationPreview = {
        text: data.text,
        version: data.version,
        service: data.service,
        metadata: data.metadata,
        generationData: data.generationData || {
          generation_type: `extraction-${serviceKey}`,
        },
        saved: data.saved,
        generationId: data.generationId,
      };

      setExtractionResults((prev) => ({
        ...prev,
        [serviceKey]: result,
      }));

      if (data.saved && data.generationId) {
        setSavedGenerationIds((prev) => ({
          ...prev,
          [serviceKey]: data.generationId,
        }));
        await refreshCurrentExtractions();
      }

      return result;
    } catch (err) {
      setExtractionResults((prev) => ({
        ...prev,
        [serviceKey]: null,
      }));
      const errorMsg = err instanceof Error ? err.message : "Extraction failed";
      setError(errorMsg);
      throw err;
    } finally {
      setExtractingServices((prev) => ({ ...prev, [serviceKey]: false }));
    }
  };

  const refreshCurrentExtractions = async () => {
    await fetchPdfFiles();
    const updatedFiles = await fetch("/api/pdf")
      .then((r) => r.json())
      .catch(() => []);
    const extractions: Record<string, AiGeneration> = {};
    for (const file of updatedFiles) {
      if (file.currentExtractionId) {
        try {
          const response = await fetch(
            `/api/pdf/${file.id}/extraction/current`
          );
          if (response.ok) {
            const data = await response.json();
            if (data) {
              extractions[file.id] = data;
            }
          }
        } catch (err) {
          console.error(`Error fetching extraction for ${file.id}:`, err);
        }
      }
    }
    setCurrentExtractions(extractions);
  };

  const handleSaveExtraction = async (
    preview: GenerationPreview
  ): Promise<void> => {
    if (!extractModalOpen) return;
    setError(null);
    try {
      // Save the generation
      const saveResponse = await fetch(
        `/api/pdf/${extractModalOpen}/generations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text_content: preview.text,
            metadata: preview.metadata,
            version: preview.version,
            generation_type:
              preview.generationData?.generation_type ||
              `extraction-${preview.service}`,
          }),
        }
      );

      if (!saveResponse.ok) {
        throw new Error("Failed to save extraction");
      }

      const savedGeneration = await saveResponse.json();

      // Update the preview to mark as saved
      setExtractionResults((prev) => ({
        ...prev,
        [preview.service]: {
          ...preview,
          saved: true,
          generationId: savedGeneration.id,
        },
      }));

      setSavedGenerationIds((prev) => ({
        ...prev,
        [preview.service]: savedGeneration.id,
      }));

      await refreshCurrentExtractions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save extraction"
      );
      throw err;
    }
  };

  const handleCloseExtractModal = () => {
    setExtractModalOpen(null);
    setSelectedServices({});
    setExtractionResults({});
    setExtractingServices({});
    setSavedGenerationIds({});
    setError(null);
  };

  const handleSetCurrentExtraction = async (
    pdfId: string,
    generationId: string
  ) => {
    try {
      const response = await fetch(`/api/pdf/${pdfId}/extraction/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set current extraction");
      }

      await fetchPdfFiles();
      const extractions: Record<string, AiGeneration> = {};
      for (const file of pdfFiles) {
        if (file.currentExtractionId) {
          try {
            const response = await fetch(
              `/api/pdf/${file.id}/extraction/current`
            );
            if (response.ok) {
              const data = await response.json();
              if (data) {
                extractions[file.id] = data;
              }
            }
          } catch (err) {
            console.error(`Error fetching extraction for ${file.id}:`, err);
          }
        }
      }
      setCurrentExtractions(extractions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current extraction"
      );
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedFiles = [...pdfFiles].sort((a, b) => {
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

  const handleView = (id: string) => {
    if (viewingId === id) {
      setViewingId(null);
    } else {
      setViewingId(id);
    }
  };

  const handleDownload = (id: string, fileName: string) => {
    const url = `/api/pdf/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    setError(null);
    try {
      const response = await fetch(`/api/pdf/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete PDF file");
      }

      // If we're viewing this file, close the viewer
      if (viewingId === id) {
        setViewingId(null);
      }

      // If we're showing extractions for this file, close them
      if (showingExtractions === id) {
        setShowingExtractions(null);
      }

      // Refresh the list
      await fetchPdfFiles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete PDF file"
      );
    } finally {
      setDeletingId(null);
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
        <p className="text-gray-600 dark:text-gray-400">Loading PDF files...</p>
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
        <h3 className="text-lg font-semibold">PDF Files ({pdfFiles.length})</h3>
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

      {pdfFiles.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No PDF files yet. Upload some files to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
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
                {viewMode === "expanded" && (
                  <>
                    <th
                      className={`${getPaddingClasses(
                        "header"
                      )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                      onClick={() => handleSort("description")}
                    >
                      <div className="flex items-center gap-2">
                        Description
                        <SortIcon field="description" />
                      </div>
                    </th>
                    <th
                      className={`${getPaddingClasses(
                        "header"
                      )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                    >
                      Original URL
                    </th>
                    <th
                      className={`${getPaddingClasses(
                        "header"
                      )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                    >
                      Categories
                    </th>
                  </>
                )}
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
                      )} whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white`}
                    >
                      {file.fileName}
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm text-gray-500 dark:text-gray-400`}
                    >
                      {formatDate(file.uploadedDate)}
                    </td>
                    {viewMode === "expanded" && (
                      <>
                        <td
                          className={`${getPaddingClasses(
                            "body"
                          )} text-sm text-gray-500 dark:text-gray-400`}
                        >
                          <div className="max-w-xs truncate">
                            {file.description || "—"}
                          </div>
                        </td>
                        <td
                          className={`${getPaddingClasses(
                            "body"
                          )} text-sm text-gray-500 dark:text-gray-400`}
                        >
                          {file.originalUrl ? (
                            <a
                              href={file.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-xs"
                            >
                              {file.originalUrl}
                            </a>
                          ) : (
                            <span className="text-gray-400">
                              Manually Uploaded
                            </span>
                          )}
                        </td>
                        <td
                          className={`${getPaddingClasses(
                            "body"
                          )} text-sm text-gray-500 dark:text-gray-400`}
                        >
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
                        </td>
                      </>
                    )}
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm text-gray-500 dark:text-gray-400`}
                    >
                      <StatusBadge status={file.status} file={file} />
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm`}
                    >
                      <div className="flex gap-3 items-center">
                        {/* Show Process button for pending or discovered files */}
                        {(file.status === "pending" ||
                          file.status === "discovered") && (
                          <button
                            onClick={() => handleProcess(file)}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors"
                            title="Process File"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                        {/* Ban/Exclude button */}
                        <button
                          onClick={() => handleExclude(file)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          title="Exclude from table"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                        {/* Hide View/Download for discovered files (not yet fetched) */}
                        {file.status !== "discovered" && (
                          <>
                            <button
                              onClick={() => router.push(`/pdf/${file.id}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                              title="View PDF detail page"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                handleDownload(file.id, file.fileName)
                              }
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                              title="Download"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setExtractModalOpen(file.id);
                            setSelectedServices({
                              openai: false,
                              pdfparsenew: false,
                            });
                            setExtractionResults({});
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                          title="Extract Text"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (showingExtractions === file.id) {
                              setShowingExtractions(null);
                            } else {
                              setShowingExtractions(file.id);
                              await fetchExtractionVersions(file.id);
                            }
                          }}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors"
                          title={
                            showingExtractions === file.id
                              ? "Hide Versions"
                              : "View Versions"
                          }
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(file.id)}
                          disabled={deletingId === file.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {showingExtractions === file.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td
                        colSpan={viewMode === "expanded" ? 7 : 4}
                        className={getPaddingClasses("body")}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">
                              Text Extractions
                            </h4>
                            <button
                              onClick={() => {
                                setShowingExtractions(null);
                              }}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <TranscriptionTable
                            generations={extractionVersions[file.id] || []}
                            currentGenerationId={
                              currentExtractions[file.id]?.id || null
                            }
                            sourceType="pdf"
                            sourceId={file.id}
                            onSetCurrent={async (generationId) => {
                              await handleSetCurrentExtraction(
                                file.id,
                                generationId
                              );
                            }}
                            onRefresh={async () => {
                              await fetchExtractionVersions(file.id);
                              await fetchPdfFiles();
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                  {viewingId === file.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <SharedPdfViewer
                              src={`/api/pdf/${file.id}/file`}
                              title={file.fileName}
                              height="600px"
                            />
                          </div>
                          <button
                            onClick={() => setViewingId(null)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            title="Close viewer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Extraction Modal */}
      {extractModalOpen && (
        <GenerationModal
          isOpen={!!extractModalOpen}
          onClose={handleCloseExtractModal}
          title="Extract Text from PDF"
          fileName={
            pdfFiles.find((f) => f.id === extractModalOpen)?.fileName || ""
          }
          services={PDF_SERVICES}
          currentGeneration={currentExtractions[extractModalOpen] || null}
          versions={extractionVersions[extractModalOpen] || []}
          currentGenerationId={currentExtractions[extractModalOpen]?.id || null}
          onSetCurrentGeneration={(generationId) =>
            handleSetCurrentExtraction(extractModalOpen, generationId)
          }
          onRunGeneration={(serviceKey) =>
            handleRunExtraction(extractModalOpen, serviceKey)
          }
          onSaveGeneration={handleSaveExtraction}
          selectedServices={selectedServices}
          onSelectedServicesChange={setSelectedServices}
          generatingServices={extractingServices}
          generationResults={extractionResults}
          savedGenerationIds={savedGenerationIds}
          error={error}
        />
      )}

      {/* Process Modal */}
      {processModalOpen && processingFile && (
        <Modal
          isOpen={!!processModalOpen}
          onClose={() => {
            setProcessModalOpen(null);
            setProcessingFile(null);
          }}
          title="Process PDF File"
        >
          <UrlUploadTab
            initialValues={{
              url: processingFile.originalUrl || "",
              description: processingFile.description,
              categories: processingFile.categories,
            }}
            processFileId={processingFile.id}
            onSuccess={handleProcessSuccess}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId &&
        (() => {
          const file = pdfFiles.find((f) => f.id === confirmDeleteId);
          if (!file) return null;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Confirm Delete
                  </h3>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    disabled={deletingId === file.id}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Are you sure you want to delete this PDF file?
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {file.fileName}
                    </p>
                    {file.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {file.description}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deletingId === file.id}
                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {deletingId === file.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
