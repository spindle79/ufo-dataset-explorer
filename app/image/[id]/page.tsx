"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import Tabs from "../../components/Tabs";
import Breadcrumbs from "../../components/shared/Breadcrumbs";
import type { ImageFile } from "../../lib/image-types";
import {
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  Download,
  Upload,
  X,
  Edit,
  FileText,
  Wand2,
  History,
} from "lucide-react";
import CategoryInput from "../../components/shared/CategoryInput";
import FormField from "../../components/shared/FormField";
import FormLabel from "../../components/shared/FormLabel";
import FormInput from "../../components/shared/FormInput";
import FormTextarea from "../../components/shared/FormTextarea";
import FormFileInput from "../../components/shared/FormFileInput";
import FormError from "../../components/shared/FormError";
import FormButton from "../../components/shared/FormButton";
import GenerationModal, {
  GenerationPreview,
} from "../../components/shared/GenerationModal";
import { AiGeneration } from "../../components/shared/GenerationViewer";
import { ServiceOption } from "../../components/shared/ServiceSelector";
import { decodeFileName } from "../../lib/utils";

const IMAGE_MODELS: ServiceOption[] = [
  {
    key: "gpt-5-nano",
    label: "GPT-5 Nano",
    description: "Fastest, most cost-effective",
  },
  {
    key: "gpt-5-mini",
    label: "GPT-5 Mini",
    description: "Balanced speed and quality",
  },
  { key: "gpt-5", label: "GPT-5", description: "Highest quality" },
];

export default function ImageDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [currentDescription, setCurrentDescription] =
    useState<AiGeneration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "image" | "description" | "history"
  >("image");

  // Description modal state
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [descriptionVersions, setDescriptionVersions] = useState<
    AiGeneration[]
  >([]);
  const [selectedModels, setSelectedModels] = useState<Record<string, boolean>>(
    {}
  );
  const [descriptionResults, setDescriptionResults] = useState<
    Record<string, GenerationPreview | null>
  >({});
  const [generatingModels, setGeneratingModels] = useState<
    Record<string, boolean>
  >({});
  const [savedGenerationIds, setSavedGenerationIds] = useState<
    Record<string, string>
  >({});

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"file" | "url">("url");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategories, setUploadCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFileNotFound(false);

      try {
        // Fetch image file metadata
        const fileResponse = await fetch(`/api/image/${id}`);
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
          throw new Error("Failed to fetch image file");
        }
        const fileData = await fileResponse.json();
        setImageFile(fileData);
        // Initialize edit form with current values
        setEditDescription(fileData.description || "");
        setEditCategories(fileData.categories || []);

        // Fetch current description if available
        const currentDescriptionId = (fileData as any).currentDescriptionId;
        if (currentDescriptionId) {
          const descriptionResponse = await fetch(
            `/api/image/${id}/description/current`
          );
          if (descriptionResponse.ok) {
            const descriptionData = await descriptionResponse.json();
            setCurrentDescription(descriptionData);
          }
        }

        // Fetch description versions on initial load
        await fetchDescriptionVersions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load image file"
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
  const fetchDescriptionVersions = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch all description types (no type filter = all description generations)
      const response = await fetch(`/api/image/${id}/generations`);
      if (response.ok) {
        const allDescriptions = await response.json();
        // Filter for description generations
        const descriptions = allDescriptions.filter((gen: any) =>
          gen.generation_type?.includes("description")
        );
        setDescriptionVersions(descriptions);
      }
    } catch (err) {
      console.error("Error fetching description versions:", err);
    }
  }, [id]);

  // Auto-refresh description history when history tab becomes active
  useEffect(() => {
    if (activeTab === "history" && id && !loading) {
      fetchDescriptionVersions();
    }
  }, [activeTab, id, loading, fetchDescriptionVersions]);

  const handleOpenDescriptionModal = async () => {
    setDescriptionModalOpen(true);
    setSelectedModels({});
    setDescriptionResults({});
    setGeneratingModels({});
    setSavedGenerationIds({});
    setError(null);
    await fetchDescriptionVersions();
  };

  const handleCloseDescriptionModal = () => {
    setDescriptionModalOpen(false);
    setSelectedModels({});
    setDescriptionResults({});
    setGeneratingModels({});
    setSavedGenerationIds({});
    setError(null);
  };

  const handleRunDescription = async (
    modelKey: string
  ): Promise<GenerationPreview> => {
    if (!id) throw new Error("No Image ID");
    setGeneratingModels((prev) => ({ ...prev, [modelKey]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/image/${id}/generate-description`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelKey,
          saveAsDescription: false, // Don't auto-save to description field
          setAsCurrent: false, // Don't auto-set as current
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Description generation failed");
      }

      const data = await response.json();
      const result: GenerationPreview = {
        text: data.text || data.description,
        version: data.version,
        service: data.service || modelKey,
        metadata: data.metadata,
        generationData: data.generationData || {
          generation_type: `description-openai-vision-${modelKey}`,
        },
        saved: data.saved,
        generationId: data.generationId,
      };

      setDescriptionResults((prev) => ({
        ...prev,
        [modelKey]: result,
      }));

      if (data.saved && data.generationId) {
        setSavedGenerationIds((prev) => ({
          ...prev,
          [modelKey]: data.generationId,
        }));
        // Refresh current description
        const fileResponse = await fetch(`/api/image/${id}`);
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          setImageFile(fileData);
          const currentDescriptionId = (fileData as any).currentDescriptionId;
          if (currentDescriptionId) {
            const descriptionResponse = await fetch(
              `/api/image/${id}/description/current`
            );
            if (descriptionResponse.ok) {
              const descriptionData = await descriptionResponse.json();
              setCurrentDescription(descriptionData);
            }
          }
        }
      }

      return result;
    } catch (err) {
      setDescriptionResults((prev) => ({
        ...prev,
        [modelKey]: null,
      }));
      const errorMsg =
        err instanceof Error ? err.message : "Description generation failed";
      setError(errorMsg);
      throw err;
    } finally {
      setGeneratingModels((prev) => ({ ...prev, [modelKey]: false }));
    }
  };

  const handleSaveDescription = async (
    preview: GenerationPreview
  ): Promise<void> => {
    if (!id || !descriptionModalOpen) return;
    setError(null);
    try {
      const saveResponse = await fetch(`/api/image/${id}/generations`, {
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
            `description-openai-vision-${preview.service}`,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save description");
      }

      const savedGeneration = await saveResponse.json();
      setDescriptionResults((prev) => ({
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

      // Refresh current description
      const fileResponse = await fetch(`/api/image/${id}`);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        setImageFile(fileData);
        const currentDescriptionId = (fileData as any).currentDescriptionId;
        if (currentDescriptionId) {
          const descriptionResponse = await fetch(
            `/api/image/${id}/description/current`
          );
          if (descriptionResponse.ok) {
            const descriptionData = await descriptionResponse.json();
            setCurrentDescription(descriptionData);
          }
        }
      }
      await fetchDescriptionVersions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save description"
      );
      throw err;
    }
  };

  const handleSetCurrentDescription = async (generationId: string) => {
    if (!id) return;
    try {
      const response = await fetch(`/api/image/${id}/description/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationId: generationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set current description");
      }

      // Refresh data
      const fileResponse = await fetch(`/api/image/${id}`);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        setImageFile(fileData);
        const currentDescriptionId = (fileData as any).currentDescriptionId;
        if (currentDescriptionId) {
          const descriptionResponse = await fetch(
            `/api/image/${id}/description/current`
          );
          if (descriptionResponse.ok) {
            const descriptionData = await descriptionResponse.json();
            setCurrentDescription(descriptionData);
          }
        }
      }
      await fetchDescriptionVersions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current description"
      );
    }
  };

  const handleDownload = () => {
    if (!imageFile) return;
    const url = `/api/image/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = decodeFileName(imageFile.fileName);
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

        const response = await fetch("/api/image/url", {
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
        router.push(`/image/${data.id}`);
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

        const response = await fetch("/api/image/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        // Redirect to the new file's detail page
        router.push(`/image/${data.id}`);
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
    if (imageFile) {
      setEditDescription(imageFile.description || "");
      setEditCategories(imageFile.categories || []);
      setEditError(null);
      setEditModalOpen(true);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditError(null);
    // Reset to current values
    if (imageFile) {
      setEditDescription(imageFile.description || "");
      setEditCategories(imageFile.categories || []);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !imageFile) return;

    setSaving(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/image/${id}`, {
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
      setImageFile(updatedFile);
      setEditModalOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Image",
              href: "/image",
              icon: <ImageIcon className="w-4 h-4" />,
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

  if (error && !fileNotFound) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Image",
              href: "/image",
              icon: <ImageIcon className="w-4 h-4" />,
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
              label: "Image",
              href: "/image",
              icon: <ImageIcon className="w-4 h-4" />,
            },
            { label: "Not Found" },
          ]}
          className="mb-4"
        />
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Image File Not Found</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This image file has not been uploaded yet. Upload it to get
              started.
            </p>
          </div>

          <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-white dark:bg-gray-900">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Image File
            </button>
          </div>
        </div>

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload Image File</h3>
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
                      label="Image File URL"
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
                        placeholder="https://example.com/image.jpg"
                        disabled={uploading}
                        required
                        error={!!uploadError && uploadType === "url"}
                      />
                    </FormField>
                  ) : (
                    <FormField
                      label="Image File"
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
                        accept="image/*"
                        onFileSelected={(file) => {
                          setUploadFile(file);
                          if (file && !file.type.startsWith("image/")) {
                            setUploadError("Please select an image file");
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
                      placeholder="Enter a description for this image file..."
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

  if (!imageFile) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Image",
              href: "/image",
              icon: <ImageIcon className="w-4 h-4" />,
            },
            { label: "Not Found" },
          ]}
          className="mb-4"
        />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Image file not found
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
            label: "Image",
            href: "/image",
            icon: <ImageIcon className="w-4 h-4" />,
          },
          {
            label: decodeFileName(imageFile.fileName),
            icon: <ImageIcon className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />

      {/* Compact Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 truncate">
            <ImageIcon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">
              {decodeFileName(imageFile.fileName)}
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {imageFile.originalUrl && (
              <a
                href={imageFile.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-md"
                title={imageFile.originalUrl}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{imageFile.originalUrl}</span>
              </a>
            )}
            <span className="flex-shrink-0">
              {new Date(imageFile.uploadedDate).toLocaleDateString()}
            </span>
            {imageFile.description && (
              <span className="truncate max-w-md" title={imageFile.description}>
                {imageFile.description}
              </span>
            )}
            {imageFile.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {imageFile.categories.slice(0, 3).map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs"
                  >
                    {cat}
                  </span>
                ))}
                {imageFile.categories.length > 3 && (
                  <span className="px-1.5 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
                    +{imageFile.categories.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <FormButton
            onClick={handleDownload}
            variant="success"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </FormButton>
          <FormButton
            onClick={handleOpenDescriptionModal}
            variant="primary"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Transcribe/Describe</span>
          </FormButton>
          <FormButton
            onClick={handleOpenEditModal}
            variant="primary"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </FormButton>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "image",
            label: "Image",
            icon: <ImageIcon className="w-4 h-4" />,
          },
          {
            id: "description",
            label: "Description",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            id: "history",
            label: "History",
            icon: <History className="w-4 h-4" />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) =>
          setActiveTab(tabId as "image" | "description" | "history")
        }
      >
        {activeTab === "image" && (
          <div className="space-y-6">
            <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
              <img
                src={`/api/image/${id}/file`}
                alt={imageFile.fileName}
                className="max-w-full max-h-[80vh] object-contain mx-auto"
              />
            </div>
          </div>
        )}
        {activeTab === "description" && (
          <div className="space-y-6">
            {!currentDescription && (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-white dark:bg-gray-900 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No description has been generated yet.
                </p>
                <FormButton
                  onClick={handleOpenDescriptionModal}
                  variant="primary"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate Description
                </FormButton>
              </div>
            )}

            {currentDescription && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Version {currentDescription.version} • Generated{" "}
                    {new Date(currentDescription.created_at).toLocaleString()}
                    {currentDescription.metadata?.model && (
                      <span> • Model: {currentDescription.metadata.model}</span>
                    )}
                  </div>
                  <FormButton
                    onClick={handleOpenDescriptionModal}
                    variant="primary"
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5"
                  >
                    <Wand2 className="w-4 h-4" />
                    Generate New
                  </FormButton>
                </div>
                <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-white dark:bg-gray-900">
                  <div className="prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {currentDescription.text_content}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            {descriptionVersions.length === 0 ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-white dark:bg-gray-900 text-center">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  No description history available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {descriptionVersions.map((version) => {
                  const isCurrent = currentDescription?.id === version.id;
                  return (
                    <div
                      key={version.id}
                      className={`border rounded p-4 ${
                        isCurrent
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          Version {version.version}
                          {isCurrent && (
                            <span className="ml-2 text-purple-600 dark:text-purple-400">
                              (Current)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(version.created_at).toLocaleString()}
                          </span>
                          {version.metadata?.model && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              • {version.metadata.model}
                            </span>
                          )}
                          {!isCurrent && (
                            <FormButton
                              onClick={() =>
                                handleSetCurrentDescription(version.id)
                              }
                              variant="primary"
                              className="text-xs px-2 py-1"
                            >
                              Set as Current
                            </FormButton>
                          )}
                        </div>
                      </div>
                      <div className="prose dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-40 overflow-y-auto">
                          {version.text_content?.substring(0, 500)}
                          {version.text_content &&
                            version.text_content.length > 500 &&
                            "..."}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Tabs>

      {/* Description Generation Modal */}
      {descriptionModalOpen && imageFile && (
        <GenerationModal
          isOpen={descriptionModalOpen}
          onClose={handleCloseDescriptionModal}
          title="Generate Description"
          fileName={imageFile.fileName}
          services={IMAGE_MODELS}
          currentGeneration={currentDescription}
          versions={descriptionVersions}
          currentGenerationId={
            currentDescription?.id ||
            (imageFile as any).currentDescriptionId ||
            null
          }
          onSetCurrentGeneration={handleSetCurrentDescription}
          onRunGeneration={handleRunDescription}
          onSaveGeneration={handleSaveDescription}
          selectedServices={selectedModels}
          onSelectedServicesChange={setSelectedModels}
          generatingServices={generatingModels}
          generationResults={descriptionResults}
          savedGenerationIds={savedGenerationIds}
          error={error}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && imageFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Image File</h3>
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
                  <FormTextarea
                    id="editDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    placeholder="Enter a description for this image file..."
                    disabled={saving}
                  />
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
