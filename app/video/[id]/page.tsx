"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Tabs from "../../components/Tabs";
import Breadcrumbs from "../../components/shared/Breadcrumbs";
import type { VideoFile } from "../../lib/video-types";
import {
  Loader2,
  ExternalLink,
  Video,
  Download,
  Upload,
  X,
  ChevronDown,
  FileText,
  History,
  Edit,
  Wand2,
} from "lucide-react";
import MarkdownEditor from "../../components/MarkdownEditor";
import CategoryInput from "../../components/shared/CategoryInput";
import TranscriptionTable from "../../components/shared/TranscriptionTable";
import VideoPlayer from "../../components/shared/VideoPlayer";
import FormField from "../../components/shared/FormField";
import FormLabel from "../../components/shared/FormLabel";
import FormInput from "../../components/shared/FormInput";
import FormTextarea from "../../components/shared/FormTextarea";
import FormFileInput from "../../components/shared/FormFileInput";
import FormError from "../../components/shared/FormError";
import FormButton from "../../components/shared/FormButton";
import Tooltip from "../../components/shared/Tooltip";
import FormCheckbox from "../../components/shared/FormCheckbox";
import { decodeFileName } from "../../lib/utils";
import PeopleTab from "../../components/entities/PeopleTab";
import LocationsTab from "../../components/entities/LocationsTab";
import CompaniesTab from "../../components/entities/CompaniesTab";
import ProgramsTab from "../../components/entities/ProgramsTab";
import { Users, MapPin, Building2, FolderKanban } from "lucide-react";

interface AiGeneration {
  id: string;
  version: number;
  generation_type: string;
  text_content: string | null;
  created_at: string;
  metadata: any;
}

export default function VideoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [currentTranscript, setCurrentTranscript] =
    useState<AiGeneration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "video"
    | "transcript"
    | "history"
    | "people"
    | "locations"
    | "companies"
    | "programs"
  >("video");

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"file" | "url">("url");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategories, setUploadCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Transcribe modal state
  const [transcribeModalOpen, setTranscribeModalOpen] = useState(false);
  const [transcriptVersions, setTranscriptVersions] = useState<AiGeneration[]>(
    []
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
  const [saveSummaryAsDescription, setSaveSummaryAsDescription] =
    useState(false);
  const [transcriptionResults, setTranscriptionResults] = useState<{
    whisper?: {
      transcript: string;
      summary?: string;
      version: number;
      service: string;
      metadata: any;
      generationData: any;
    } | null;
    assemblyai?: {
      transcript: string;
      summary?: string;
      version: number;
      service: string;
      metadata: any;
      generationData: any;
    } | null;
    "gpt-4o-transcribe"?: {
      transcript: string;
      version: number;
      service: string;
      metadata: any;
      generationData: any;
    } | null;
    "gpt-4o-transcribe-diarize"?: {
      transcript: string;
      version: number;
      service: string;
      metadata: any;
      generationData: any;
    } | null;
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
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);

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

  // Handler functions
  const fetchTranscriptVersions = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch all transcript types (no type filter = all transcript generations)
      const response = await fetch(`/api/video/${id}/generations`);
      if (response.ok) {
        const allTranscripts = await response.json();
        setTranscriptVersions(allTranscripts);
      }
    } catch (err) {
      console.error("Error fetching transcript versions:", err);
    }
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFileNotFound(false);

      try {
        // Fetch video file metadata
        const fileResponse = await fetch(`/api/video/${id}`);
        if (!fileResponse.ok) {
          if (fileResponse.status === 404) {
            setFileNotFound(true);
            // Check if ID is a URL or get URL from query params
            try {
              new URL(id);
              setUploadUrl(id);
            } catch {
              const urlParam = searchParams.get("url");
              if (urlParam) {
                setUploadUrl(urlParam);
              }
            }
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch video file");
        }
        const fileData = await fileResponse.json();
        setVideoFile(fileData);
        // Initialize edit form with current values
        setEditDescription(fileData.description || "");
        setEditCategories(fileData.categories || []);

        // Fetch current transcript if available
        if (fileData.currentTranscriptId) {
          const transcriptResponse = await fetch(
            `/api/video/${id}/transcript/current`
          );
          if (transcriptResponse.ok) {
            const transcriptData = await transcriptResponse.json();
            setCurrentTranscript(transcriptData);
          }
        }

        // Fetch transcription history on initial load
        await fetchTranscriptVersions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load video file"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, searchParams, fetchTranscriptVersions]);

  // Auto-refresh transcription history when history tab becomes active
  useEffect(() => {
    if (activeTab === "history" && id && !loading) {
      fetchTranscriptVersions();
    }
  }, [activeTab, id, loading, fetchTranscriptVersions]);

  if (loading) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Video",
              href: "/video",
              icon: <Music className="w-4 h-4" />,
            },
            { label: "Loading..." },
          ]}
          className="mb-4"
        />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading...
          </span>
        </div>
      </main>
    );
  }

  const handleOpenTranscribeModal = async () => {
    setTranscribeModalOpen(true);
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
    setSaveSummaryAsDescription(false);
    setSelectedVersionId(null);
    setError(null);
    await fetchTranscriptVersions();
  };

  const handleCloseTranscribeModal = () => {
    setTranscribeModalOpen(false);
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
    setSaveSummaryAsDescription(false);
    setSelectedVersionId(null);
    setShowVersionDropdown(false);
    setError(null);
  };

  const handleTranscribe = async (
    service:
      | "whisper"
      | "assemblyai"
      | "gpt-4o-transcribe"
      | "gpt-4o-transcribe-diarize"
  ) => {
    if (!id) return;
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
            service === "assemblyai" ? saveSummaryAsDescription : false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to transcribe with ${service}`
        );
      }

      const data = await response.json();
      const result = {
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
      }

      setTranscriptionResults((prev) => ({
        ...prev,
        [service]: result,
      }));

      // Auto-refresh transcription history after successful transcription
      await fetchTranscriptVersions();
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

  const handleRunTranscriptions = async () => {
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
      promises.push(handleTranscribe("whisper"));
    }
    if (selectedServices.assemblyai) {
      promises.push(handleTranscribe("assemblyai"));
    }
    if (selectedServices["gpt-4o-transcribe"]) {
      promises.push(handleTranscribe("gpt-4o-transcribe"));
    }
    if (selectedServices["gpt-4o-transcribe-diarize"]) {
      promises.push(handleTranscribe("gpt-4o-transcribe-diarize"));
    }

    await Promise.all(promises);

    // Refresh transcription history after all transcriptions complete
    await fetchTranscriptVersions();
  };

  const handleSetCurrentTranscript = async (
    service:
      | "whisper"
      | "assemblyai"
      | "gpt-4o-transcribe"
      | "gpt-4o-transcribe-diarize"
  ) => {
    if (!id) return;
    const generationId = savedGenerationIds[service];
    if (!generationId) {
      setError("Transcript not saved yet");
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/video/${id}/transcript/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationId: generationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set current transcript");
      }

      // Refresh data
      const fileResponse = await fetch(`/api/video/${id}`);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        setVideoFile(fileData);
        if (fileData.currentTranscriptId) {
          const transcriptResponse = await fetch(
            `/api/video/${id}/transcript/current`
          );
          if (transcriptResponse.ok) {
            const transcriptData = await transcriptResponse.json();
            setCurrentTranscript(transcriptData);
          }
        }
      }
      await fetchTranscriptVersions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current transcript"
      );
    }
  };

  const handleDownload = () => {
    if (!videoFile) return;
    const url = `/api/video/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = decodeFileName(videoFile.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);

    try {
      if (uploadType === "url") {
        if (!uploadUrl.trim()) {
          setUploadError("Please enter a URL");
          return;
        }

        if (!validateUrl(uploadUrl)) {
          setUploadError("Please enter a valid URL");
          return;
        }

        const response = await fetch("/api/video/url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: uploadUrl.trim(),
            description: uploadDescription,
            categories: uploadCategories,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        // Redirect to the new file's detail page
        router.push(`/video/${data.id}`);
        router.refresh();
      } else {
        if (!uploadFile) {
          setUploadError("Please select a file");
          return;
        }

        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("description", uploadDescription);
        formData.append("categories", uploadCategories.join(","));

        const response = await fetch("/api/video/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        // Redirect to the new file's detail page
        router.push(`/video/${data.id}`);
        router.refresh();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadUrl("");
    setUploadFile(null);
    setUploadDescription("");
    setUploadCategories([]);
    setUploadError(null);
  };

  const handleOpenEditModal = () => {
    if (videoFile) {
      setEditDescription(videoFile.description || "");
      setEditCategories(videoFile.categories || []);
      setEditError(null);
      setEditModalOpen(true);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditError(null);
    // Reset to current values
    if (videoFile) {
      setEditDescription(videoFile.description || "");
      setEditCategories(videoFile.categories || []);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !videoFile) return;

    setSaving(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/video/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: editDescription,
          categories: editCategories,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update");
      }

      const updatedFile = await response.json();
      setVideoFile(updatedFile);
      setEditModalOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!id || generatingDescription || !currentTranscript) return;

    setGeneratingDescription(true);
    setError(null);

    try {
      const response = await fetch(`/api/video/${id}/generate-description`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-5-nano" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate description");
      }

      const result = await response.json();

      // Update local state with the new description
      if (result.file) {
        setVideoFile(result.file);
        setEditDescription(result.file.description || "");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate description"
      );
    } finally {
      setGeneratingDescription(false);
    }
  };

  if (error && !fileNotFound) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Video",
              href: "/video",
              icon: <Music className="w-4 h-4" />,
            },
            { label: "Error" },
          ]}
          className="mb-4"
        />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </main>
    );
  }

  if (fileNotFound) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Video",
              href: "/video",
              icon: <Music className="w-4 h-4" />,
            },
            { label: "Not Found" },
          ]}
          className="mb-4"
        />
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Video File Not Found</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This video file has not been uploaded yet. Upload it to get
              started.
            </p>
          </div>

          <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-white dark:bg-gray-900">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Video File
            </button>
          </div>
        </div>

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload Video File</h3>
                  <button
                    onClick={handleCloseUploadModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setUploadType("url")}
                    className={`px-4 py-2 font-medium text-sm ${
                      uploadType === "url"
                        ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    From URL
                  </button>
                  <button
                    onClick={() => setUploadType("file")}
                    className={`px-4 py-2 font-medium text-sm ${
                      uploadType === "file"
                        ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Upload File
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-6">
                  {uploadType === "url" ? (
                    <FormField
                      label="Video File URL"
                      htmlFor="uploadUrl"
                      required
                      error={
                        uploadError && uploadType === "url"
                          ? uploadError
                          : undefined
                      }
                    >
                      <FormInput
                        type="url"
                        id="uploadUrl"
                        value={uploadUrl}
                        onChange={(e) => setUploadUrl(e.target.value)}
                        placeholder="https://example.com/video.mp3"
                        disabled={uploading}
                        required
                        error={!!uploadError && uploadType === "url"}
                      />
                    </FormField>
                  ) : (
                    <FormField
                      label="Video File"
                      htmlFor="uploadFile"
                      required
                      error={
                        uploadError && uploadType === "file"
                          ? uploadError
                          : undefined
                      }
                    >
                      <FormFileInput
                        id="uploadFile"
                        accept="video/*"
                        onFileSelected={(file) => {
                          setUploadFile(file);
                          if (file && !file.type.startsWith("video/")) {
                            setUploadError("Please select an video file");
                          } else {
                            setUploadError(null);
                          }
                        }}
                        disabled={uploading}
                        required
                      />
                      {uploadFile && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Selected: {decodeFileName(uploadFile.name)} (
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </FormField>
                  )}

                  <FormField
                    label="Description (optional)"
                    htmlFor="uploadDescription"
                  >
                    <FormTextarea
                      id="uploadDescription"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={4}
                      placeholder="Enter a description for this video file..."
                      disabled={uploading}
                    />
                  </FormField>

                  <FormField label="Categories (optional)">
                    <CategoryInput
                      value={uploadCategories}
                      onChange={setUploadCategories}
                      disabled={uploading}
                      placeholder="Type a category and press Enter..."
                    />
                  </FormField>

                  {uploadError && <FormError message={uploadError} />}

                  <div className="flex gap-3">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={handleCloseUploadModal}
                      disabled={uploading}
                      className="flex-1"
                    >
                      Cancel
                    </FormButton>
                    <FormButton
                      type="submit"
                      variant="primary"
                      loading={uploading}
                      disabled={
                        uploading ||
                        (uploadType === "url" ? !uploadUrl.trim() : !uploadFile)
                      }
                      className="flex-1"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </FormButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!videoFile) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Video",
              href: "/video",
              icon: <Music className="w-4 h-4" />,
            },
            { label: "Not Found" },
          ]}
          className="mb-4"
        />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Video file not found
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 min-w-screen">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          {
            label: "Video",
            href: "/video",
            icon: <Music className="w-4 h-4" />,
          },
          {
            label: decodeFileName(videoFile.fileName),
            icon: <Music className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />

      {/* Compact Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 truncate">
            <Music className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">
              {decodeFileName(videoFile.fileName)}
            </span>
          </h1>
          <div className="flex items-start gap-2 mb-2">
            {videoFile.description ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                {videoFile.description}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic flex-1">
                No description available
              </p>
            )}
            {currentTranscript && currentTranscript.text_content && (
              <button
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                title={
                  videoFile.description
                    ? "Regenerate description using AI"
                    : "Generate description using AI"
                }
              >
                {generatingDescription ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {videoFile.originalUrl && (
              <a
                href={videoFile.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-md"
                title={videoFile.originalUrl}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{videoFile.originalUrl}</span>
              </a>
            )}
            <span className="flex-shrink-0">
              {new Date(videoFile.uploadedDate).toLocaleDateString()}
            </span>
          </div>
          {videoFile.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {videoFile.categories.slice(0, 3).map((cat, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs"
                >
                  {cat}
                </span>
              ))}
              {videoFile.categories.length > 3 && (
                <span className="px-1.5 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
                  +{videoFile.categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Tooltip
            id="download-video-detail"
            content="Download <b>video file</b> to your device"
            html
          >
          <FormButton
            onClick={handleDownload}
            variant="success"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </FormButton>
          </Tooltip>
          <Tooltip
            id="edit-video-detail"
            content="Edit video <b>metadata</b> and details"
            html
          >
          <FormButton
            onClick={handleOpenEditModal}
            variant="primary"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </FormButton>
          </Tooltip>
          <Tooltip
            id="transcribe-video-detail"
            content="Generate <u>video transcription</u>"
            html
          >
          <FormButton
            onClick={handleOpenTranscribeModal}
            variant="purple"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Transcribe</span>
          </FormButton>
          </Tooltip>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "video", label: "Video", icon: <Music className="w-4 h-4" /> },
          {
            id: "transcript",
            label: "Transcript",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            id: "history",
            label: "History",
            icon: <History className="w-4 h-4" />,
          },
          {
            id: "people",
            label: "People",
            icon: <Users className="w-4 h-4" />,
          },
          {
            id: "locations",
            label: "Locations",
            icon: <MapPin className="w-4 h-4" />,
          },
          {
            id: "companies",
            label: "Companies",
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            id: "programs",
            label: "Programs",
            icon: <FolderKanban className="w-4 h-4" />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) =>
          setActiveTab(
            tabId as
              | "video"
              | "transcript"
              | "history"
              | "people"
              | "locations"
              | "companies"
              | "programs"
          )
        }
      >
        {activeTab === "video" && (
          <div className="space-y-6">
            <VideoPlayer
              src={`/api/video/${id}/file`}
              mimeType={videoFile?.mimeType}
              title="Video Player"
            />
          </div>
        )}

        {activeTab === "transcript" && (
          <div className="space-y-6">
            {/* Transcript */}
            {currentTranscript ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Current Transcript</h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Version {currentTranscript.version} •{" "}
                    {new Date(currentTranscript.created_at).toLocaleString()}
                    {currentTranscript.metadata?.service && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                        {currentTranscript.metadata.service}
                      </span>
                    )}
                  </div>
                </div>
                <MarkdownEditor
                  value={
                    currentTranscript.text_content || "No transcript available"
                  }
                  readOnly={true}
                  maxHeight="60vh"
                />
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">
                  No transcript available. Click the Transcribe button above to
                  create one.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Transcription History */}
            <TranscriptionTable
              generations={transcriptVersions}
              currentGenerationId={currentTranscript?.id || null}
              sourceType="video"
              sourceId={id}
              onSetCurrent={async (generationId) => {
                try {
                  const response = await fetch(
                    `/api/video/${id}/transcript/current`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ generationId }),
                    }
                  );

                  if (!response.ok) {
                    throw new Error("Failed to set current transcript");
                  }

                  // Refresh data
                  const fileResponse = await fetch(`/api/video/${id}`);
                  if (fileResponse.ok) {
                    const fileData = await fileResponse.json();
                    setVideoFile(fileData);
                    if (fileData.currentTranscriptId) {
                      const transcriptResponse = await fetch(
                        `/api/video/${id}/transcript/current`
                      );
                      if (transcriptResponse.ok) {
                        const transcriptData = await transcriptResponse.json();
                        setCurrentTranscript(transcriptData);
                      }
                    }
                  }
                  await fetchTranscriptVersions();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to set current transcript"
                  );
                }
              }}
              onRefresh={async () => {
                await fetchTranscriptVersions();
                // Refresh current transcript
                if (videoFile?.currentTranscriptId) {
                  const transcriptResponse = await fetch(
                    `/api/video/${id}/transcript/current`
                  );
                  if (transcriptResponse.ok) {
                    const transcriptData = await transcriptResponse.json();
                    setCurrentTranscript(transcriptData);
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === "people" && (
          <PeopleTab 
            content={currentTranscript?.text_content || null}
            sourceType="video"
            sourceId={id}
          />
        )}
        {activeTab === "locations" && (
          <LocationsTab 
            content={currentTranscript?.text_content || null}
            sourceType="video"
            sourceId={id}
          />
        )}
        {activeTab === "companies" && (
          <CompaniesTab 
            content={currentTranscript?.text_content || null}
            sourceType="video"
            sourceId={id}
          />
        )}
        {activeTab === "programs" && (
          <ProgramsTab 
            content={currentTranscript?.text_content || null}
            sourceType="video"
            sourceId={id}
          />
        )}
      </Tabs>

      {/* Transcribe Modal */}
      {transcribeModalOpen && videoFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Transcribe Video</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {videoFile.fileName}
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
                    {transcriptVersions.length > 0 && (
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
                            {transcriptVersions.map((gen) => (
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
                                  currentTranscript?.id === gen.id
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
                                  {currentTranscript?.id === gen.id && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(() => {
                    let displayTranscript: AiGeneration | null = null;
                    if (selectedVersionId) {
                      displayTranscript =
                        transcriptVersions.find(
                          (g) => g.id === selectedVersionId
                        ) || null;
                    } else {
                      displayTranscript = currentTranscript;
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
                      <FormCheckbox
                        label="OpenAI Whisper (Multilingual)"
                        checked={selectedServices.whisper}
                        onChange={(e) =>
                          setSelectedServices((prev) => ({
                            ...prev,
                            whisper: e.target.checked,
                          }))
                        }
                      />
                      <FormCheckbox
                        label="Assembly AI (Advanced Features + Summary)"
                        checked={selectedServices.assemblyai}
                        onChange={(e) =>
                          setSelectedServices((prev) => ({
                            ...prev,
                            assemblyai: e.target.checked,
                          }))
                        }
                      />
                      {selectedServices.assemblyai && (
                        <FormCheckbox
                          label="Save summary as description"
                          checked={saveSummaryAsDescription}
                          onChange={(e) =>
                            setSaveSummaryAsDescription(e.target.checked)
                          }
                          labelClassName="ml-6"
                        />
                      )}
                      <FormCheckbox
                        label="GPT-4o Transcribe (Timestamps)"
                        checked={selectedServices["gpt-4o-transcribe"]}
                        onChange={(e) =>
                          setSelectedServices((prev) => ({
                            ...prev,
                            "gpt-4o-transcribe": e.target.checked,
                          }))
                        }
                      />
                      <FormCheckbox
                        label="GPT-4o Transcribe (Diarization)"
                        checked={selectedServices["gpt-4o-transcribe-diarize"]}
                        onChange={(e) =>
                          setSelectedServices((prev) => ({
                            ...prev,
                            "gpt-4o-transcribe-diarize": e.target.checked,
                          }))
                        }
                      />
                    </div>
                    <FormButton
                      onClick={handleRunTranscriptions}
                      variant="purple"
                      loading={
                        transcribingServices.whisper ||
                        transcribingServices.assemblyai ||
                        transcribingServices["gpt-4o-transcribe"] ||
                        transcribingServices["gpt-4o-transcribe-diarize"]
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
                      className="mt-4 w-full"
                    >
                      Run Transcription
                    </FormButton>
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
                              <FormButton
                                onClick={() =>
                                  handleSetCurrentTranscript("whisper")
                                }
                                variant="primary"
                                disabled={
                                  currentTranscript?.id ===
                                  savedGenerationIds.whisper
                                }
                                className="px-3 py-1 text-xs"
                              >
                                {currentTranscript?.id ===
                                savedGenerationIds.whisper
                                  ? "Current"
                                  : "Set as Current"}
                              </FormButton>
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
                              <FormButton
                                onClick={() =>
                                  handleSetCurrentTranscript("assemblyai")
                                }
                                variant="primary"
                                disabled={
                                  currentTranscript?.id ===
                                  savedGenerationIds.assemblyai
                                }
                                className="px-3 py-1 text-xs"
                              >
                                {currentTranscript?.id ===
                                savedGenerationIds.assemblyai
                                  ? "Current"
                                  : "Set as Current"}
                              </FormButton>
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
                              <FormButton
                                onClick={() =>
                                  handleSetCurrentTranscript(
                                    "gpt-4o-transcribe"
                                  )
                                }
                                variant="primary"
                                disabled={
                                  currentTranscript?.id ===
                                  savedGenerationIds["gpt-4o-transcribe"]
                                }
                                className="px-3 py-1 text-xs"
                              >
                                {currentTranscript?.id ===
                                savedGenerationIds["gpt-4o-transcribe"]
                                  ? "Current"
                                  : "Set as Current"}
                              </FormButton>
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
                              <FormButton
                                onClick={() =>
                                  handleSetCurrentTranscript(
                                    "gpt-4o-transcribe-diarize"
                                  )
                                }
                                variant="primary"
                                disabled={
                                  currentTranscript?.id ===
                                  savedGenerationIds[
                                    "gpt-4o-transcribe-diarize"
                                  ]
                                }
                                className="px-3 py-1 text-xs"
                              >
                                {currentTranscript?.id ===
                                savedGenerationIds["gpt-4o-transcribe-diarize"]
                                  ? "Current"
                                  : "Set as Current"}
                              </FormButton>
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

      {/* Edit Modal */}
      {editModalOpen && videoFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Video File</h3>
                <button
                  onClick={handleCloseEditModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveEdit} className="space-y-6">
                <FormField
                  label="Description (optional)"
                  htmlFor="editDescription"
                >
                  <div className="flex items-start gap-2">
                    <FormTextarea
                      id="editDescription"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      placeholder="Enter a description for this video file..."
                      disabled={saving}
                      className="flex-1"
                    />
                    {currentTranscript && currentTranscript.text_content && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!id || generatingDescription) return;

                          setGeneratingDescription(true);
                          setEditError(null);

                          try {
                            const response = await fetch(
                              `/api/video/${id}/generate-description`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ model: "gpt-5-nano" }),
                              }
                            );

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(
                                errorData.error ||
                                  "Failed to generate description"
                              );
                            }

                            const result = await response.json();
                            setEditDescription(result.description || "");
                          } catch (err) {
                            setEditError(
                              err instanceof Error
                                ? err.message
                                : "Failed to generate description"
                            );
                          } finally {
                            setGeneratingDescription(false);
                          }
                        }}
                        disabled={generatingDescription || saving}
                        className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mt-1"
                        title="Generate description using AI"
                      >
                        {generatingDescription ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </FormField>

                <FormField label="Categories (optional)">
                  <CategoryInput
                    value={editCategories}
                    onChange={setEditCategories}
                    disabled={saving}
                    placeholder="Type a category and press Enter..."
                  />
                </FormField>

                {editError && <FormError message={editError} />}

                <div className="flex gap-3">
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={handleCloseEditModal}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancel
                  </FormButton>
                  <FormButton
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </FormButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
