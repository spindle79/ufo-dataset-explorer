"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VideoFile } from "../../lib/video-types";
import TranscriptionTable from "../shared/TranscriptionTable";
import VideoPlayer from "../shared/VideoPlayer";
import { decodeFileName } from "../../lib/utils";
import UrlUploadTab from "./UrlUploadTab";
import Modal from "../shared/Modal";
import {
  Video,
  Loader2,
  Play,
  Pause,
  Download,
  FileText,
  X,
  ChevronUp,
  ChevronDown,
  Minus,
  Edit,
  Save,
  Eye,
  LayoutGrid,
  List,
  Maximize2,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Plus,
  Cloud,
  HardDrive,
  Ban,
} from "lucide-react";

type SortField = "fileName" | "uploadedDate" | "description";
type SortOrder = "asc" | "desc";

interface TranscriptPreview {
  transcript: string;
  summary?: string;
  version: number;
  service: string;
  metadata: any;
  generationData: any;
}

interface AiGeneration {
  id: string;
  version: number;
  generation_type: string;
  text_content: string | null;
  created_at: string;
  metadata: any;
}

type ViewMode = "condensed" | "normal" | "expanded";

interface VideoViewerProps {
  filterIds?: string[];
  defaultViewMode?: ViewMode;
}

/**
 * Helper function to check if a file is URL-only (not downloaded)
 */
function isUrlOnlyFile(file: VideoFile): boolean {
  // Check if file_path is a placeholder path (starts with "discovered/")
  // OR if file_size is null/0 and originalUrl exists
  return (
    file.filePath.startsWith("discovered/") ||
    ((file.fileSize == null || file.fileSize === 0) && file.originalUrl != null)
  );
}

/**
 * Status Badge Component
 * Displays the status of a video file with appropriate colors and icons
 */
function StatusBadge({
  status,
  file,
}: {
  status: "discovered" | "pending" | "processing" | "parsed" | "error";
  file: VideoFile;
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

export default function VideoViewer({
  filterIds,
  defaultViewMode = "normal",
}: VideoViewerProps = {}) {
  const router = useRouter();
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("uploadedDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTranscripts, setCurrentTranscripts] = useState<
    Record<string, AiGeneration>
  >({});
  const [transcriptVersions, setTranscriptVersions] = useState<
    Record<string, AiGeneration[]>
  >({});
  const [showingTranscripts, setShowingTranscripts] = useState<string | null>(
    null
  );
  const [transcribeModalOpen, setTranscribeModalOpen] = useState<string | null>(
    null
  );
  const [selectedServices, setSelectedServices] = useState<{
    whisper: boolean;
    assemblyai: boolean;
    "gpt-4o-transcribe": boolean;
    "gpt-4o-transcribe-diarize": boolean;
  }>({
    whisper: false,
    assemblyai: false,
    "gpt-4o-transcribe": false,
    "gpt-4o-transcribe-diarize": false,
  });
  const [saveSummaryAsDescription, setSaveSummaryAsDescription] = useState<
    Record<string, boolean>
  >({});
  const [processModalOpen, setProcessModalOpen] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState<VideoFile | null>(null);
  const [transcriptionResults, setTranscriptionResults] = useState<{
    whisper?: TranscriptPreview | null;
    assemblyai?: TranscriptPreview | null;
    "gpt-4o-transcribe"?: TranscriptPreview | null;
    "gpt-4o-transcribe-diarize"?: TranscriptPreview | null;
  }>({});
  const [transcribingServices, setTranscribingServices] = useState<{
    whisper: boolean;
    assemblyai: boolean;
    "gpt-4o-transcribe": boolean;
    "gpt-4o-transcribe-diarize": boolean;
  }>({
    whisper: false,
    assemblyai: false,
    "gpt-4o-transcribe": false,
    "gpt-4o-transcribe-diarize": false,
  });
  const [savedGenerationIds, setSavedGenerationIds] = useState<{
    whisper?: string;
    assemblyai?: string;
    "gpt-4o-transcribe"?: string;
    "gpt-4o-transcribe-diarize"?: string;
  }>({});
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );

  const fetchVideoFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/video");
      if (!response.ok) {
        throw new Error("Failed to fetch video files");
      }
      const data = await response.json();
      // Filter by IDs if filterIds prop is provided
      let filtered = filterIds
        ? data.filter((file: VideoFile) => filterIds.includes(file.id))
        : data;
      // Filter out excluded files
      filtered = filtered.filter(
        (file: VideoFile) => !(file as any).metadata?.excluded
      );
      setVideoFiles(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load video files"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoFiles();
  }, [filterIds]);

  // Close version dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showVersionDropdown &&
        !(event.target as Element).closest(".version-dropdown-container")
      ) {
        setShowVersionDropdown(false);
      }
    };

    if (showVersionDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showVersionDropdown]);

  // Fetch current transcripts for all video files
  useEffect(() => {
    const fetchCurrentTranscripts = async () => {
      const transcripts: Record<string, AiGeneration> = {};
      for (const file of videoFiles) {
        if (file.currentTranscriptId) {
          try {
            const response = await fetch(
              `/api/video/${file.id}/transcript/current`
            );
            if (response.ok) {
              const data = await response.json();
              if (data) {
                transcripts[file.id] = data;
              }
            }
          } catch (err) {
            console.error(`Error fetching transcript for ${file.id}:`, err);
          }
        }
      }
      setCurrentTranscripts(transcripts);
    };

    if (videoFiles.length > 0) {
      fetchCurrentTranscripts();
    }
  }, [videoFiles]);

  const fetchTranscriptVersions = async (videoId: string) => {
    try {
      // Fetch all transcript types (no type filter = all transcript generations)
      const response = await fetch(`/api/video/${videoId}/generations`);
      if (response.ok) {
        const allTranscripts = await response.json();
        setTranscriptVersions((prev) => ({
          ...prev,
          [videoId]: allTranscripts,
        }));
      }
    } catch (err) {
      console.error("Error fetching transcript versions:", err);
    }
  };

  const handleOpenTranscribeModal = async (id: string) => {
    setTranscribeModalOpen(id);
    setSelectedServices({
      whisper: false,
      assemblyai: false,
      "gpt-4o-transcribe": false,
      "gpt-4o-transcribe-diarize": false,
    });
    setTranscriptionResults({});
    setTranscribingServices({
      whisper: false,
      assemblyai: false,
      "gpt-4o-transcribe": false,
      "gpt-4o-transcribe-diarize": false,
    });
    setSavedGenerationIds({});
    setSaveSummaryAsDescription((prev) => ({ ...prev, [id]: false }));
    setSelectedVersionId(null);
    setError(null);
    // Fetch transcript versions for the dropdown
    await fetchTranscriptVersions(id);
  };

  const handleTranscribe = async (
    id: string,
    service:
      | "whisper"
      | "assemblyai"
      | "gpt-4o-transcribe"
      | "gpt-4o-transcribe-diarize"
  ) => {
    setTranscribingServices((prev) => ({ ...prev, [service]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/video/${id}/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service,
          saveSummaryAsDescription:
            service === "assemblyai"
              ? saveSummaryAsDescription[id] || false
              : false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to transcribe with ${service}`
        );
      }

      const data = await response.json();
      const result: TranscriptPreview = {
        transcript: data.transcript,
        summary: data.summary,
        version: data.version,
        service: data.service,
        metadata: data.metadata,
        generationData: data.generationData,
      };

      // Auto-save to database
      try {
        const saveResponse = await fetch(`/api/video/${id}/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text_content: result.transcript,
            metadata: result.metadata,
            version: result.version,
            generation_type: result.generationData.generation_type,
          }),
        });

        if (saveResponse.ok) {
          const savedGeneration = await saveResponse.json();
          setSavedGenerationIds((prev) => ({
            ...prev,
            [service]: savedGeneration.id,
          }));
        }
      } catch (saveError) {
        console.error("Failed to auto-save transcript:", saveError);
        // Don't throw - we still want to show the result even if save fails
      }

      setTranscriptionResults((prev) => ({
        ...prev,
        [service]: result,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to transcribe with ${service}`
      );
      setTranscriptionResults((prev) => ({
        ...prev,
        [service]: null,
      }));
    } finally {
      setTranscribingServices((prev) => ({ ...prev, [service]: false }));
    }
  };

  const handleRunTranscriptions = async (id: string) => {
    if (
      !selectedServices.whisper &&
      !selectedServices.assemblyai &&
      !selectedServices["gpt-4o-transcribe"] &&
      !selectedServices["gpt-4o-transcribe-diarize"]
    ) {
      setError("Please select at least one service");
      return;
    }

    setTranscriptionResults({});
    setError(null);

    const promises: Promise<void>[] = [];
    if (selectedServices.whisper) {
      promises.push(handleTranscribe(id, "whisper"));
    }
    if (selectedServices.assemblyai) {
      promises.push(handleTranscribe(id, "assemblyai"));
    }
    if (selectedServices["gpt-4o-transcribe"]) {
      promises.push(handleTranscribe(id, "gpt-4o-transcribe"));
    }
    if (selectedServices["gpt-4o-transcribe-diarize"]) {
      promises.push(handleTranscribe(id, "gpt-4o-transcribe-diarize"));
    }

    await Promise.all(promises);
  };

  const handleSetCurrentTranscript = async (
    videoId: string,
    service:
      | "whisper"
      | "assemblyai"
      | "gpt-4o-transcribe"
      | "gpt-4o-transcribe-diarize"
  ) => {
    const generationId = savedGenerationIds[service];
    if (!generationId) {
      setError("Transcript not saved yet");
      return;
    }

    setError(null);
    try {
      // Set as current transcript
      const currentResponse = await fetch(
        `/api/video/${videoId}/transcript/current`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generationId: generationId,
          }),
        }
      );

      if (!currentResponse.ok) {
        throw new Error("Failed to set current transcript");
      }

      // Refresh video files to get updated currentTranscriptId
      await fetchVideoFiles();
      // Refresh current transcripts
      if (videoFiles.length > 0) {
        const transcripts: Record<string, AiGeneration> = {};
        for (const file of videoFiles) {
          if (file.currentTranscriptId) {
            try {
              const response = await fetch(
                `/api/video/${file.id}/transcript/current`
              );
              if (response.ok) {
                const data = await response.json();
                if (data) {
                  transcripts[file.id] = data;
                }
              }
            } catch (err) {
              console.error(`Error fetching transcript for ${file.id}:`, err);
            }
          }
        }
        setCurrentTranscripts(transcripts);
      }
      // Refresh versions
      await fetchTranscriptVersions(videoId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current transcript"
      );
    }
  };

  const handleCloseTranscribeModal = () => {
    setTranscribeModalOpen(null);
    setSelectedServices({
      whisper: false,
      assemblyai: false,
      "gpt-4o-transcribe": false,
      "gpt-4o-transcribe-diarize": false,
    });
    setTranscriptionResults({});
    setTranscribingServices({
      whisper: false,
      assemblyai: false,
      "gpt-4o-transcribe": false,
      "gpt-4o-transcribe-diarize": false,
    });
    setSavedGenerationIds({});
    setSelectedVersionId(null);
    setShowVersionDropdown(false);
    setError(null);
  };

  const handleSetCurrentTranscriptById = async (
    videoId: string,
    generationId: string
  ) => {
    try {
      const response = await fetch(`/api/video/${videoId}/transcript/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to set current transcript");
      }

      await fetchVideoFiles();
      // Refresh current transcripts
      if (videoFiles.length > 0) {
        const transcripts: Record<string, AiGeneration> = {};
        for (const file of videoFiles) {
          if (file.currentTranscriptId) {
            try {
              const response = await fetch(
                `/api/video/${file.id}/transcript/current`
              );
              if (response.ok) {
                const data = await response.json();
                if (data) {
                  transcripts[file.id] = data;
                }
              }
            } catch (err) {
              console.error(`Error fetching transcript for ${file.id}:`, err);
            }
          }
        }
        setCurrentTranscripts(transcripts);
      }
      // Refresh versions
      await fetchTranscriptVersions(videoId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current transcript"
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

  const sortedFiles = [...videoFiles].sort((a, b) => {
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

  const handlePlay = (id: string) => {
    if (playingId === id) {
      // If already playing, stop it
      setPlayingId(null);
    } else {
      // Play this file
      setPlayingId(id);
    }
  };

  const handleDownload = (id: string, fileName: string) => {
    const url = `/api/video/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = decodeFileName(fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcess = (file: VideoFile) => {
    setProcessingFile(file);
    setProcessModalOpen(file.id);
  };

  const handleProcessSuccess = async () => {
    setProcessModalOpen(null);
    setProcessingFile(null);
    // Refresh the video files list to show updated status
    await fetchVideoFiles();
  };

  const handleExclude = async (file: VideoFile) => {
    try {
      const response = await fetch(`/api/video/${file.id}/exclude`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to exclude file");
      }

      // Refresh the video files list
      await fetchVideoFiles();
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
          Loading video files...
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
          Video Files ({videoFiles.length})
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

      {videoFiles.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No video files yet. Upload some files to get started!
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
                      {decodeFileName(file.fileName)}
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
                          onClick={() => router.push(`/video/${file.id}`)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
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
                        {/* Hide Play/Download for discovered files (not yet fetched) */}
                        {file.status !== "discovered" && (
                          <>
                            <button
                              onClick={() => handlePlay(file.id)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                              title={playingId === file.id ? "Stop" : "Play"}
                            >
                              {playingId === file.id ? (
                                <Pause className="w-5 h-5" />
                              ) : (
                                <Play className="w-5 h-5" />
                              )}
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
                        {/* Show Transcribe and Edit buttons only for files that are not pending or discovered */}
                        {file.status !== "pending" &&
                          file.status !== "discovered" && (
                            <>
                              <button
                                onClick={() =>
                                  handleOpenTranscribeModal(file.id)
                                }
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                                title="Transcribe"
                              >
                                <Video className="w-5 h-5" />
                              </button>
                              {currentTranscripts[file.id] && (
                                <button
                                  onClick={() => {
                                    if (showingTranscripts === file.id) {
                                      setShowingTranscripts(null);
                                    } else {
                                      setShowingTranscripts(file.id);
                                      fetchTranscriptVersions(file.id);
                                    }
                                  }}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                                  title="View Transcript"
                                >
                                  <FileText className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => router.push(`/video/${file.id}`)}
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
                      <td colSpan={4} className={getPaddingClasses("body")}>
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
                      </td>
                    </tr>
                  )}
                  {playingId === file.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={4} className={getPaddingClasses("body")}>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <VideoPlayer
                              src={`/api/video/${file.id}/file`}
                              mimeType={file.mimeType}
                              autoPlay={true}
                              showTitle={false}
                              onEnded={() => setPlayingId(null)}
                              onPause={() => setPlayingId(null)}
                              className="border-0 p-0 bg-transparent"
                            />
                          </div>
                          <button
                            onClick={() => setPlayingId(null)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            title="Close player"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {showingTranscripts === file.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">
                              Transcript Versions
                            </h4>
                            <button
                              onClick={() => setShowingTranscripts(null)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <TranscriptionTable
                            generations={transcriptVersions[file.id] || []}
                            currentGenerationId={
                              currentTranscripts[file.id]?.id || null
                            }
                            sourceType="video"
                            sourceId={file.id}
                            onSetCurrent={async (generationId) => {
                              await handleSetCurrentTranscriptById(
                                file.id,
                                generationId
                              );
                            }}
                            onRefresh={async () => {
                              await fetchTranscriptVersions(file.id);
                              await fetchVideoFiles();
                            }}
                          />
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

      {/* Transcription Modal */}
      {transcribeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Transcribe Video</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {
                      videoFiles.find((f) => f.id === transcribeModalOpen)
                        ?.fileName
                    }
                  </p>
                </div>
                <button
                  onClick={handleCloseTranscribeModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* Left Side - Current Transcript */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold">
                      Current Transcript
                    </h4>
                    {transcriptVersions[transcribeModalOpen] &&
                      transcriptVersions[transcribeModalOpen].length > 0 && (
                        <div className="relative version-dropdown-container">
                          <button
                            onClick={() =>
                              setShowVersionDropdown(!showVersionDropdown)
                            }
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            View Versions
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {showVersionDropdown && (
                            <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                              {transcriptVersions[transcribeModalOpen].map(
                                (gen) => (
                                  <button
                                    key={gen.id}
                                    onClick={() => {
                                      setSelectedVersionId(gen.id);
                                      setShowVersionDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                      selectedVersionId === gen.id
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : ""
                                    } ${
                                      currentTranscripts[transcribeModalOpen]
                                        ?.id === gen.id
                                        ? "border-l-2 border-blue-500"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium">
                                          Version {gen.version} (
                                          {gen.metadata?.service ||
                                            gen.generation_type?.replace(
                                              "transcript-",
                                              ""
                                            ) ||
                                            "unknown"}
                                          )
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {new Date(
                                            gen.created_at
                                          ).toLocaleString()}
                                        </div>
                                      </div>
                                      {currentTranscripts[transcribeModalOpen]
                                        ?.id === gen.id && (
                                        <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                  {(() => {
                    let displayTranscript: AiGeneration | null = null;
                    if (selectedVersionId) {
                      displayTranscript =
                        transcriptVersions[transcribeModalOpen]?.find(
                          (g) => g.id === selectedVersionId
                        ) || null;
                    } else {
                      displayTranscript =
                        currentTranscripts[transcribeModalOpen] || null;
                    }

                    return displayTranscript ? (
                      <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900">
                        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                          Version {displayTranscript.version} •{" "}
                          {new Date(
                            displayTranscript.created_at
                          ).toLocaleString()}
                          {displayTranscript.metadata?.service && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                              {displayTranscript.metadata.service}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-y-auto max-h-[60vh]">
                          {displayTranscript.text_content ||
                            "No transcript available"}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">
                          No transcript available
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Side - New Transcriptions */}
                <div className="flex flex-col">
                  <h4 className="text-md font-semibold mb-4">
                    New Transcriptions
                  </h4>

                  {/* Service Selection */}
                  <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900">
                    <div className="text-sm font-medium mb-3">
                      Select Services:
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedServices.whisper}
                          onChange={(e) =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              whisper: e.target.checked,
                            }))
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          OpenAI Whisper (Multilingual)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedServices.assemblyai}
                          onChange={(e) =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              assemblyai: e.target.checked,
                            }))
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          Assembly AI (Advanced Features + Summary)
                        </span>
                      </label>
                      {selectedServices.assemblyai && transcribeModalOpen && (
                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={
                              saveSummaryAsDescription[transcribeModalOpen] ||
                              false
                            }
                            onChange={(e) =>
                              setSaveSummaryAsDescription((prev) => ({
                                ...prev,
                                [transcribeModalOpen]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Save summary as description
                          </span>
                        </label>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedServices["gpt-4o-transcribe"]}
                          onChange={(e) =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              "gpt-4o-transcribe": e.target.checked,
                            }))
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          GPT-4o Transcribe (Timestamps)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            selectedServices["gpt-4o-transcribe-diarize"]
                          }
                          onChange={(e) =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              "gpt-4o-transcribe-diarize": e.target.checked,
                            }))
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          GPT-4o Transcribe (Diarization)
                        </span>
                      </label>
                    </div>
                    <button
                      onClick={() =>
                        handleRunTranscriptions(transcribeModalOpen!)
                      }
                      disabled={
                        (!selectedServices.whisper &&
                          !selectedServices.assemblyai &&
                          !selectedServices["gpt-4o-transcribe"] &&
                          !selectedServices["gpt-4o-transcribe-diarize"]) ||
                        transcribingServices.whisper ||
                        transcribingServices.assemblyai ||
                        transcribingServices["gpt-4o-transcribe"] ||
                        transcribingServices["gpt-4o-transcribe-diarize"]
                      }
                      className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {transcribingServices.whisper ||
                      transcribingServices.assemblyai ||
                      transcribingServices["gpt-4o-transcribe"] ||
                      transcribingServices["gpt-4o-transcribe-diarize"] ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Transcribing...
                        </span>
                      ) : (
                        "Run Transcription"
                      )}
                    </button>
                  </div>

                  {/* Results */}
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {/* Whisper Result */}
                    {selectedServices.whisper && (
                      <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              OpenAI Whisper
                            </span>
                            {transcribingServices.whisper && (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            )}
                          </div>
                          {transcriptionResults.whisper &&
                            savedGenerationIds.whisper && (
                              <button
                                onClick={() =>
                                  handleSetCurrentTranscript(
                                    transcribeModalOpen,
                                    "whisper"
                                  )
                                }
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={
                                  currentTranscripts[transcribeModalOpen]
                                    ?.id === savedGenerationIds.whisper
                                }
                              >
                                {currentTranscripts[transcribeModalOpen]?.id ===
                                savedGenerationIds.whisper
                                  ? "Current"
                                  : "Set as Current"}
                              </button>
                            )}
                        </div>
                        {transcriptionResults.whisper ? (
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Version {transcriptionResults.whisper.version}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                              {transcriptionResults.whisper.transcript}
                            </div>
                            {transcriptionResults.whisper.metadata && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {transcriptionResults.whisper.metadata
                                  .language && (
                                  <span>
                                    Language:{" "}
                                    {
                                      transcriptionResults.whisper.metadata
                                        .language
                                    }{" "}
                                    •{" "}
                                  </span>
                                )}
                                {transcriptionResults.whisper.metadata
                                  .duration && (
                                  <span>
                                    Duration:{" "}
                                    {transcriptionResults.whisper.metadata.duration.toFixed(
                                      2
                                    )}
                                    s
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : transcriptionResults.whisper === null ? (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            Transcription failed
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No transcription yet
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assembly AI Result */}
                    {selectedServices.assemblyai && (
                      <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              Assembly AI
                            </span>
                            {transcribingServices.assemblyai && (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            )}
                          </div>
                          {transcriptionResults.assemblyai &&
                            savedGenerationIds.assemblyai && (
                              <button
                                onClick={() =>
                                  handleSetCurrentTranscript(
                                    transcribeModalOpen,
                                    "assemblyai"
                                  )
                                }
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={
                                  currentTranscripts[transcribeModalOpen]
                                    ?.id === savedGenerationIds.assemblyai
                                }
                              >
                                {currentTranscripts[transcribeModalOpen]?.id ===
                                savedGenerationIds.assemblyai
                                  ? "Current"
                                  : "Set as Current"}
                              </button>
                            )}
                        </div>
                        {transcriptionResults.assemblyai ? (
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Version {transcriptionResults.assemblyai.version}
                            </div>
                            {transcriptionResults.assemblyai.summary && (
                              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                  Summary:
                                </div>
                                <div className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">
                                  {transcriptionResults.assemblyai.summary}
                                </div>
                              </div>
                            )}
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                              {transcriptionResults.assemblyai.transcript}
                            </div>
                            {transcriptionResults.assemblyai.metadata && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {transcriptionResults.assemblyai.metadata
                                  .language && (
                                  <span>
                                    Language:{" "}
                                    {
                                      transcriptionResults.assemblyai.metadata
                                        .language
                                    }{" "}
                                    •{" "}
                                  </span>
                                )}
                                {transcriptionResults.assemblyai.metadata
                                  .confidence && (
                                  <span>
                                    Confidence:{" "}
                                    {(
                                      transcriptionResults.assemblyai.metadata
                                        .confidence * 100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : transcriptionResults.assemblyai === null ? (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            Transcription failed
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No transcription yet
                          </div>
                        )}
                      </div>
                    )}

                    {/* GPT-4o Transcribe Result */}
                    {selectedServices["gpt-4o-transcribe"] && (
                      <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              GPT-4o Transcribe
                            </span>
                            {transcribingServices["gpt-4o-transcribe"] && (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            )}
                          </div>
                          {transcriptionResults["gpt-4o-transcribe"] &&
                            savedGenerationIds["gpt-4o-transcribe"] && (
                              <button
                                onClick={() =>
                                  handleSetCurrentTranscript(
                                    transcribeModalOpen!,
                                    "gpt-4o-transcribe"
                                  )
                                }
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={
                                  currentTranscripts[transcribeModalOpen!]
                                    ?.id ===
                                  savedGenerationIds["gpt-4o-transcribe"]
                                }
                              >
                                {currentTranscripts[transcribeModalOpen!]
                                  ?.id ===
                                savedGenerationIds["gpt-4o-transcribe"]
                                  ? "Current"
                                  : "Set as Current"}
                              </button>
                            )}
                        </div>
                        {transcriptionResults["gpt-4o-transcribe"] ? (
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Version{" "}
                              {
                                transcriptionResults["gpt-4o-transcribe"]
                                  .version
                              }
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                              {
                                transcriptionResults["gpt-4o-transcribe"]
                                  .transcript
                              }
                            </div>
                            {transcriptionResults["gpt-4o-transcribe"]
                              .metadata && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {transcriptionResults["gpt-4o-transcribe"]
                                  .metadata.language && (
                                  <span>
                                    Language:{" "}
                                    {
                                      transcriptionResults["gpt-4o-transcribe"]
                                        .metadata.language
                                    }{" "}
                                    •{" "}
                                  </span>
                                )}
                                {transcriptionResults["gpt-4o-transcribe"]
                                  .metadata.duration && (
                                  <span>
                                    Duration:{" "}
                                    {transcriptionResults[
                                      "gpt-4o-transcribe"
                                    ].metadata.duration.toFixed(2)}
                                    s
                                    {transcriptionResults["gpt-4o-transcribe"]
                                      .metadata.words && (
                                      <span>
                                        {" "}
                                        • Word-level timestamps available
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : transcriptionResults["gpt-4o-transcribe"] ===
                          null ? (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            Transcription failed
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No transcription yet
                          </div>
                        )}
                      </div>
                    )}

                    {/* GPT-4o Transcribe Diarize Result */}
                    {selectedServices["gpt-4o-transcribe-diarize"] && (
                      <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              GPT-4o Transcribe (Diarization)
                            </span>
                            {transcribingServices[
                              "gpt-4o-transcribe-diarize"
                            ] && (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            )}
                          </div>
                          {transcriptionResults["gpt-4o-transcribe-diarize"] &&
                            savedGenerationIds["gpt-4o-transcribe-diarize"] && (
                              <button
                                onClick={() =>
                                  handleSetCurrentTranscript(
                                    transcribeModalOpen!,
                                    "gpt-4o-transcribe-diarize"
                                  )
                                }
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={
                                  currentTranscripts[transcribeModalOpen!]
                                    ?.id ===
                                  savedGenerationIds[
                                    "gpt-4o-transcribe-diarize"
                                  ]
                                }
                              >
                                {currentTranscripts[transcribeModalOpen!]
                                  ?.id ===
                                savedGenerationIds["gpt-4o-transcribe-diarize"]
                                  ? "Current"
                                  : "Set as Current"}
                              </button>
                            )}
                        </div>
                        {transcriptionResults["gpt-4o-transcribe-diarize"] ? (
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Version{" "}
                              {
                                transcriptionResults[
                                  "gpt-4o-transcribe-diarize"
                                ].version
                              }
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                              {
                                transcriptionResults[
                                  "gpt-4o-transcribe-diarize"
                                ].transcript
                              }
                            </div>
                            {transcriptionResults["gpt-4o-transcribe-diarize"]
                              .metadata && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {transcriptionResults[
                                  "gpt-4o-transcribe-diarize"
                                ].metadata.language && (
                                  <span>
                                    Language:{" "}
                                    {
                                      transcriptionResults[
                                        "gpt-4o-transcribe-diarize"
                                      ].metadata.language
                                    }{" "}
                                    •{" "}
                                  </span>
                                )}
                                {transcriptionResults[
                                  "gpt-4o-transcribe-diarize"
                                ].metadata.duration && (
                                  <span>
                                    Duration:{" "}
                                    {transcriptionResults[
                                      "gpt-4o-transcribe-diarize"
                                    ].metadata.duration.toFixed(2)}
                                    s
                                    {transcriptionResults[
                                      "gpt-4o-transcribe-diarize"
                                    ].metadata.segments && (
                                      <span>
                                        {" "}
                                        • Speaker diarization available
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : transcriptionResults[
                            "gpt-4o-transcribe-diarize"
                          ] === null ? (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            Transcription failed
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No transcription yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {error && (
              <div className="px-6 py-3 bg-red-100 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Process Modal */}
      {processModalOpen && processingFile && (
        <Modal
          isOpen={!!processModalOpen}
          onClose={() => {
            setProcessModalOpen(null);
            setProcessingFile(null);
          }}
          title="Process Video File"
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
    </div>
  );
}
