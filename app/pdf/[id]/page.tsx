"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Breadcrumbs from "../../components/shared/Breadcrumbs";
import type { PdfFile } from "../../lib/pdf-types";
import {
  Loader2,
  ExternalLink,
  FileText,
  Download,
  Upload,
  X,
  Edit,
  History,
  Wand2,
  Link2,
  Music,
  Video,
  File,
  Image as ImageIcon,
} from "lucide-react";
import MarkdownEditor from "../../components/MarkdownEditor";
import CategoryInput from "../../components/shared/CategoryInput";
import GenerationModal, {
  GenerationPreview,
} from "../../components/shared/GenerationModal";
import TranscriptionTable from "../../components/shared/TranscriptionTable";
import PdfViewerComponent from "../../components/shared/PdfViewer";
import PdfViewer from "../../components/pdf/PdfViewer";
import FormButton from "../../components/shared/FormButton";
import Tooltip from "../../components/shared/Tooltip";
import FormField from "../../components/shared/FormField";
import FormTextarea from "../../components/shared/FormTextarea";
import FormError from "../../components/shared/FormError";
import Tabs from "../../components/Tabs";
import { AiGeneration } from "../../components/shared/GenerationViewer";
import { ServiceOption } from "../../components/shared/ServiceSelector";
import AudioViewer from "../../components/audio/AudioViewer";
import ImageViewer from "../../components/image/ImageViewer";
import PeopleTab from "../../components/entities/PeopleTab";
import LocationsTab from "../../components/entities/LocationsTab";
import CompaniesTab from "../../components/entities/CompaniesTab";
import ProgramsTab from "../../components/entities/ProgramsTab";
import { Users, MapPin, Building2, FolderKanban } from "lucide-react";

const PDF_SERVICES: ServiceOption[] = [
  { key: "openai", label: "OpenAI", description: "Processed & Refined" },
  {
    key: "pdfparsenew",
    label: "PDF Parse New",
    description: "Alternative Parser",
  },
];

export default function PdfDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [currentExtraction, setCurrentExtraction] =
    useState<AiGeneration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "pdf"
    | "extraction"
    | "history"
    | "links"
    | "images"
    | "audio"
    | "video"
    | "documents"
    | "people"
    | "locations"
    | "companies"
    | "programs"
  >("pdf");
  const [links, setLinks] = useState<
    Array<{
      url: string;
      type: "link" | "image" | "audio" | "video" | "iframe" | "pdf" | "text";
      text?: string;
      alt?: string;
      existingRecord?: {
        type: "scrape" | "audio" | "pdf" | "video" | "image";
        id: string;
        href: string;
      };
    }>
  >([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [audioFileIds, setAudioFileIds] = useState<string[]>([]);
  const [pdfFileIds, setPdfFileIds] = useState<string[]>([]);
  const [imageFileIds, setImageFileIds] = useState<string[]>([]);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"file" | "url">("url");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategories, setUploadCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Extract modal state
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractionVersions, setExtractionVersions] = useState<AiGeneration[]>(
    []
  );
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

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFileNotFound(false);

      try {
        // Fetch PDF file metadata
        const fileResponse = await fetch(`/api/pdf/${id}`);
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
          throw new Error("Failed to fetch PDF file");
        }
        const fileData = await fileResponse.json();
        setPdfFile(fileData);
        // Initialize edit form with current values
        setEditDescription(fileData.description || "");
        setEditCategories(fileData.categories || []);

        // Fetch current extraction if available
        if (fileData.currentExtractionId) {
          const extractionResponse = await fetch(
            `/api/pdf/${id}/extraction/current`
          );
          if (extractionResponse.ok) {
            const extractionData = await extractionResponse.json();
            setCurrentExtraction(extractionData);
          }
        }

        // Fetch extraction versions on initial load
        await fetchExtractionVersions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load PDF file"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, searchParams]);

  // Handler functions
  const fetchExtractionVersions = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch all extraction types (no type filter = all extraction generations)
      const response = await fetch(`/api/pdf/${id}/generations`);
      if (response.ok) {
        const allExtractions = await response.json();
        setExtractionVersions(allExtractions);
      }
    } catch (err) {
      console.error("Error fetching extraction versions:", err);
    }
  }, [id]);

  // Auto-refresh extraction history when history tab becomes active
  useEffect(() => {
    if (activeTab === "history" && id && !loading) {
      fetchExtractionVersions();
    }
  }, [activeTab, id, loading, fetchExtractionVersions]);

  // Load links when switching to a links-related tab
  useEffect(() => {
    if (
      id &&
      (activeTab === "links" ||
        activeTab === "images" ||
        activeTab === "audio" ||
        activeTab === "video" ||
        activeTab === "documents")
    ) {
      const fetchLinks = async () => {
        setLoadingLinks(true);
        try {
          const response = await fetch(`/api/pdf/${id}/links`);
          if (response.ok) {
            const data = await response.json();
            const allLinks = data.links || [];
            setLinks(allLinks);

            // Extract audio, PDF, and image file IDs from links
            const audioIds = allLinks
              .filter(
                (link: (typeof allLinks)[0]) =>
                  link.existingRecord?.type === "audio"
              )
              .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);
            const pdfIds = allLinks
              .filter(
                (link: (typeof allLinks)[0]) =>
                  link.existingRecord?.type === "pdf"
              )
              .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);
            const imageIds = allLinks
              .filter(
                (link: (typeof allLinks)[0]) =>
                  link.existingRecord?.type === "image"
              )
              .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);

            setAudioFileIds(audioIds);
            setPdfFileIds(pdfIds);
            setImageFileIds(imageIds);
          } else {
            setLinks([]);
            setAudioFileIds([]);
            setPdfFileIds([]);
            setImageFileIds([]);
          }
        } catch (err) {
          console.error("Error loading links:", err);
          setLinks([]);
          setAudioFileIds([]);
          setPdfFileIds([]);
          setImageFileIds([]);
        } finally {
          setLoadingLinks(false);
        }
      };
      fetchLinks();
    }
  }, [id, activeTab]);

  if (loading) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "PDF",
              href: "/pdf",
              icon: <FileText className="w-4 h-4" />,
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

  const handleOpenExtractModal = async () => {
    setExtractModalOpen(true);
    setSelectedServices({ openai: false, pdfparsenew: false });
    setExtractionResults({});
    setExtractingServices({});
    setSavedGenerationIds({});
    setError(null);
    await fetchExtractionVersions();
  };

  const handleCloseExtractModal = () => {
    setExtractModalOpen(false);
    setSelectedServices({});
    setExtractionResults({});
    setExtractingServices({});
    setSavedGenerationIds({});
    setError(null);
  };

  const handleRunExtraction = async (
    serviceKey: string
  ): Promise<GenerationPreview> => {
    if (!id) throw new Error("No PDF ID");
    setExtractingServices((prev) => ({ ...prev, [serviceKey]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/pdf/${id}/extract`, {
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
        // Refresh current extraction
        const fileResponse = await fetch(`/api/pdf/${id}`);
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          setPdfFile(fileData);
          if (fileData.currentExtractionId) {
            const extractionResponse = await fetch(
              `/api/pdf/${id}/extraction/current`
            );
            if (extractionResponse.ok) {
              const extractionData = await extractionResponse.json();
              setCurrentExtraction(extractionData);
            }
          }
        }
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

  const handleSaveExtraction = async (
    preview: GenerationPreview
  ): Promise<void> => {
    if (!id || !extractModalOpen) return;
    setError(null);
    try {
      const saveResponse = await fetch(`/api/pdf/${id}/generations`, {
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
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save extraction");
      }

      const savedGeneration = await saveResponse.json();
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

      // Refresh current extraction
      const fileResponse = await fetch(`/api/pdf/${id}`);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        setPdfFile(fileData);
        if (fileData.currentExtractionId) {
          const extractionResponse = await fetch(
            `/api/pdf/${id}/extraction/current`
          );
          if (extractionResponse.ok) {
            const extractionData = await extractionResponse.json();
            setCurrentExtraction(extractionData);
          }
        }
      }
      await fetchExtractionVersions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save extraction"
      );
      throw err;
    }
  };

  const handleSetCurrentExtraction = async (generationId: string) => {
    if (!id) return;
    try {
      const response = await fetch(`/api/pdf/${id}/extraction/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationId: generationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set current extraction");
      }

      // Refresh data
      const fileResponse = await fetch(`/api/pdf/${id}`);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        setPdfFile(fileData);
        if (fileData.currentExtractionId) {
          const extractionResponse = await fetch(
            `/api/pdf/${id}/extraction/current`
          );
          if (extractionResponse.ok) {
            const extractionData = await extractionResponse.json();
            setCurrentExtraction(extractionData);
          }
        }
      }
      await fetchExtractionVersions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current extraction"
      );
    }
  };

  const handleDownload = () => {
    if (!pdfFile) return;
    const url = `/api/pdf/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = pdfFile.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type !== "application/pdf" &&
        !selectedFile.name.toLowerCase().endsWith(".pdf")
      ) {
        setUploadError("Please select a PDF file");
        return;
      }
      setUploadFile(selectedFile);
      setUploadError(null);
    }
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

        const response = await fetch("/api/pdf/url", {
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
        router.push(`/pdf/${data.id}`);
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

        const response = await fetch("/api/pdf/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        // Redirect to the new file's detail page
        router.push(`/pdf/${data.id}`);
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
    if (pdfFile) {
      setEditDescription(pdfFile.description || "");
      setEditCategories(pdfFile.categories || []);
      setEditError(null);
      setEditModalOpen(true);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditError(null);
    // Reset to current values
    if (pdfFile) {
      setEditDescription(pdfFile.description || "");
      setEditCategories(pdfFile.categories || []);
    }
  };

  const handleGenerateDescription = async () => {
    if (!id || generatingDescription) return;

    // Check if we have content available
    const hasContent =
      (currentExtraction && currentExtraction.text_content) ||
      (pdfFile && pdfFile.extractedText);

    if (!hasContent) {
      setError(
        "No extracted text available. Please extract text from the PDF first."
      );
      return;
    }

    setGeneratingDescription(true);
    setError(null);

    try {
      const response = await fetch(`/api/pdf/${id}/generate-description`, {
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
        setPdfFile(result.file);
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !pdfFile) return;

    setSaving(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/pdf/${id}`, {
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
      setPdfFile(updatedFile);
      setEditModalOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (error && !fileNotFound) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "PDF",
              href: "/pdf",
              icon: <FileText className="w-4 h-4" />,
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
              label: "PDF",
              href: "/pdf",
              icon: <FileText className="w-4 h-4" />,
            },
            { label: "Not Found" },
          ]}
          className="mb-4"
        />
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">PDF File Not Found</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This PDF file has not been uploaded yet. Upload it to get started.
            </p>
          </div>

          <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-white dark:bg-gray-900">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload PDF File
            </button>
          </div>
        </div>

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload PDF File</h3>
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
                    <div>
                      <label
                        htmlFor="uploadUrl"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        PDF File URL
                      </label>
                      <input
                        type="url"
                        id="uploadUrl"
                        value={uploadUrl}
                        onChange={(e) => setUploadUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="https://example.com/document.pdf"
                        disabled={uploading}
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="uploadFile"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        PDF File
                      </label>
                      <input
                        type="file"
                        id="uploadFile"
                        accept="application/pdf,.pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          dark:file:bg-blue-900 dark:file:text-blue-300"
                        disabled={uploading}
                        required
                      />
                      {uploadFile && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Selected: {uploadFile.name} (
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="uploadDescription"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Description (optional)
                    </label>
                    <textarea
                      id="uploadDescription"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter a description for this PDF file..."
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Categories (optional)
                    </label>
                    <CategoryInput
                      value={uploadCategories}
                      onChange={setUploadCategories}
                      disabled={uploading}
                      placeholder="Type a category and press Enter..."
                      apiPath="/api/pdf/categories"
                    />
                  </div>

                  {uploadError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      disabled={uploading}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        uploading ||
                        (uploadType === "url" ? !uploadUrl.trim() : !uploadFile)
                      }
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!pdfFile) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "PDF",
              href: "/pdf",
              icon: <FileText className="w-4 h-4" />,
            },
            { label: "Not Found" },
          ]}
          className="mb-4"
        />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          PDF file not found
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
            label: "PDF",
            href: "/pdf",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            label: pdfFile.fileName,
            icon: <FileText className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />

      {/* Compact Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 truncate">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{pdfFile.fileName}</span>
          </h1>
          <div className="flex items-start gap-2 mb-2">
            {pdfFile.description ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                {pdfFile.description}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic flex-1">
                No description available
              </p>
            )}
            {((currentExtraction && currentExtraction.text_content) ||
              (pdfFile && pdfFile.extractedText)) && (
              <button
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                title={
                  pdfFile.description
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
            {pdfFile.originalUrl && (
              <a
                href={pdfFile.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-md"
                title={pdfFile.originalUrl}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{pdfFile.originalUrl}</span>
              </a>
            )}
            <span className="flex-shrink-0">
              {new Date(pdfFile.uploadedDate).toLocaleDateString()}
            </span>
            {pdfFile.pageCount && (
              <span className="flex-shrink-0">{pdfFile.pageCount} pages</span>
            )}
          </div>
          {pdfFile.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {pdfFile.categories.slice(0, 3).map((cat, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs"
                >
                  {cat}
                </span>
              ))}
              {pdfFile.categories.length > 3 && (
                <span className="px-1.5 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
                  +{pdfFile.categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Tooltip
            id="download-pdf-detail"
            content="Download <b>PDF file</b> to your device"
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
            id="edit-pdf-detail"
            content="Edit PDF <b>metadata</b> and details"
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
          <FormButton
            onClick={handleOpenExtractModal}
            variant="purple"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Extract Text</span>
          </FormButton>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "pdf", label: "PDF", icon: <FileText className="w-4 h-4" /> },
          {
            id: "extraction",
            label: "Extracted Text",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            id: "history",
            label: "History",
            icon: <History className="w-4 h-4" />,
          },
          {
            id: "links",
            label: "Links",
            icon: <Link2 className="w-4 h-4" />,
          },
          {
            id: "images",
            label: "Images",
            icon: <ImageIcon className="w-4 h-4" />,
          },
          {
            id: "audio",
            label: "Audio",
            icon: <Music className="w-4 h-4" />,
          },
          {
            id: "video",
            label: "Video",
            icon: <Video className="w-4 h-4" />,
          },
          {
            id: "documents",
            label: "Documents",
            icon: <File className="w-4 h-4" />,
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
              | "pdf"
              | "extraction"
              | "history"
              | "links"
              | "images"
              | "audio"
              | "video"
              | "documents"
              | "people"
              | "locations"
              | "companies"
              | "programs"
          )
        }
      >
        {activeTab === "pdf" && (
          <div className="space-y-6">
            <PdfViewerComponent
              src={`/api/pdf/${id}/file`}
              title="PDF Viewer"
              height="600px"
            />
          </div>
        )}

        {activeTab === "extraction" && (
          <div className="space-y-6">
            {/* Extracted Text */}
            {currentExtraction ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Current Extraction</h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Version {currentExtraction.version} •{" "}
                    {new Date(currentExtraction.created_at).toLocaleString()}
                    {currentExtraction.metadata?.service && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs capitalize">
                        {currentExtraction.metadata.service}
                      </span>
                    )}
                  </div>
                </div>
                <MarkdownEditor
                  value={
                    currentExtraction.text_content || "No extraction available"
                  }
                  readOnly={true}
                  maxHeight="60vh"
                />
              </div>
            ) : pdfFile.extractedText ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
                <h3 className="text-lg font-semibold mb-4">Extracted Text</h3>
                <MarkdownEditor
                  value={pdfFile.extractedText}
                  readOnly={true}
                  maxHeight="60vh"
                />
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">
                  No extracted text available. Click the Extract Text button
                  above to extract text from this file.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Extraction History */}
            <TranscriptionTable
              generations={extractionVersions}
              currentGenerationId={currentExtraction?.id || null}
              sourceType="pdf"
              sourceId={id}
              defaultViewMode="normal"
              enableViewModeToggle={true}
              onSetCurrent={async (generationId) => {
                try {
                  const response = await fetch(
                    `/api/pdf/${id}/extraction/current`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ generationId }),
                    }
                  );

                  if (!response.ok) {
                    throw new Error("Failed to set current extraction");
                  }

                  // Refresh data
                  const fileResponse = await fetch(`/api/pdf/${id}`);
                  if (fileResponse.ok) {
                    const fileData = await fileResponse.json();
                    setPdfFile(fileData);
                    if (fileData.currentExtractionId) {
                      const extractionResponse = await fetch(
                        `/api/pdf/${id}/extraction/current`
                      );
                      if (extractionResponse.ok) {
                        const extractionData = await extractionResponse.json();
                        setCurrentExtraction(extractionData);
                      }
                    }
                  }
                  await fetchExtractionVersions();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to set current extraction"
                  );
                }
              }}
              onRefresh={async () => {
                await fetchExtractionVersions();
                // Refresh current extraction
                if (pdfFile?.currentExtractionId) {
                  const extractionResponse = await fetch(
                    `/api/pdf/${id}/extraction/current`
                  );
                  if (extractionResponse.ok) {
                    const extractionData = await extractionResponse.json();
                    setCurrentExtraction(extractionData);
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === "links" && (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading links...
                </span>
              </div>
            ) : (
              (() => {
                const filteredLinks = links.filter(
                  (link) => link.type === "link" || link.type === "iframe"
                );
                if (filteredLinks.length === 0) {
                  return (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No links found
                    </p>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            URL
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Info
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredLinks.map((link, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center gap-1"
                              >
                                {link.url}
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {link.text && (
                                <div
                                  className="truncate max-w-xs"
                                  title={link.text}
                                >
                                  {link.text}
                                </div>
                              )}
                              {link.alt && (
                                <div
                                  className="truncate max-w-xs"
                                  title={link.alt}
                                >
                                  Alt: {link.alt}
                                </div>
                              )}
                              {!link.text && !link.alt && (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {link.existingRecord ? (
                                <a
                                  href={link.existingRecord.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                >
                                  <span>
                                    Already processed (
                                    {link.existingRecord.type})
                                  </span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400">
                                  Not processed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {activeTab === "images" && (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading images...
                </span>
              </div>
            ) : imageFileIds.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No images linked from this PDF
              </p>
            ) : (
              <ImageViewer
                filterIds={imageFileIds}
                defaultViewMode="condensed"
              />
            )}
          </div>
        )}

        {activeTab === "audio" && (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading audio files...
                </span>
              </div>
            ) : audioFileIds.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No audio files linked from this PDF
              </p>
            ) : (
              <AudioViewer
                filterIds={audioFileIds}
                defaultViewMode="condensed"
              />
            )}
          </div>
        )}

        {activeTab === "video" && (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading videos...
                </span>
              </div>
            ) : (
              (() => {
                const videoLinks = links.filter(
                  (link) => link.type === "video"
                );
                if (videoLinks.length === 0) {
                  return (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No videos found
                    </p>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            URL
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Info
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {videoLinks.map((link, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center gap-1"
                              >
                                {link.url}
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {link.text && (
                                <div
                                  className="truncate max-w-xs"
                                  title={link.text}
                                >
                                  {link.text}
                                </div>
                              )}
                              {link.alt && (
                                <div
                                  className="truncate max-w-xs"
                                  title={link.alt}
                                >
                                  Alt: {link.alt}
                                </div>
                              )}
                              {!link.text && !link.alt && (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {link.existingRecord ? (
                                <a
                                  href={link.existingRecord.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                >
                                  <span>
                                    Already processed (
                                    {link.existingRecord.type})
                                  </span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400">
                                  Not processed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading documents...
                </span>
              </div>
            ) : pdfFileIds.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No documents linked from this PDF
              </p>
            ) : (
              <PdfViewer filterIds={pdfFileIds} defaultViewMode="condensed" />
            )}
          </div>
        )}

        {activeTab === "people" && (
          <PeopleTab
            content={
              currentExtraction?.text_content || pdfFile?.extractedText || null
            }
            sourceType="pdf"
            sourceId={id}
          />
        )}
        {activeTab === "locations" && (
          <LocationsTab
            content={
              currentExtraction?.text_content || pdfFile?.extractedText || null
            }
            sourceType="pdf"
            sourceId={id}
          />
        )}
        {activeTab === "companies" && (
          <CompaniesTab
            content={
              currentExtraction?.text_content || pdfFile?.extractedText || null
            }
            sourceType="pdf"
            sourceId={id}
          />
        )}
        {activeTab === "programs" && (
          <ProgramsTab
            content={
              currentExtraction?.text_content || pdfFile?.extractedText || null
            }
            sourceType="pdf"
            sourceId={id}
          />
        )}
      </Tabs>

      {/* Extract Modal */}
      {extractModalOpen && pdfFile && (
        <GenerationModal
          isOpen={extractModalOpen}
          onClose={handleCloseExtractModal}
          title="Extract Text from PDF"
          fileName={pdfFile.fileName}
          services={PDF_SERVICES}
          currentGeneration={currentExtraction}
          versions={extractionVersions}
          currentGenerationId={currentExtraction?.id || null}
          onSetCurrentGeneration={handleSetCurrentExtraction}
          onRunGeneration={handleRunExtraction}
          onSaveGeneration={handleSaveExtraction}
          selectedServices={selectedServices}
          onSelectedServicesChange={setSelectedServices}
          generatingServices={extractingServices}
          generationResults={extractionResults}
          savedGenerationIds={savedGenerationIds}
          error={error}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && pdfFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit PDF File</h3>
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
                      placeholder="Enter a description for this PDF file..."
                      disabled={saving}
                      className="flex-1"
                    />
                    {((currentExtraction && currentExtraction.text_content) ||
                      (pdfFile && pdfFile.extractedText)) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!id || generatingDescription) return;

                          const hasContent =
                            (currentExtraction &&
                              currentExtraction.text_content) ||
                            (pdfFile && pdfFile.extractedText);

                          if (!hasContent) {
                            setEditError(
                              "No extracted text available. Please extract text from the PDF first."
                            );
                            return;
                          }

                          setGeneratingDescription(true);
                          setEditError(null);

                          try {
                            const response = await fetch(
                              `/api/pdf/${id}/generate-description`,
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
