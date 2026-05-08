"use client";

import { useState, useEffect, useCallback } from "react";
import Tabs from "../Tabs";
import type { ImageFile } from "@/lib/image-types";
import {
  Loader2,
  FileText,
  History,
  Wand2,
} from "lucide-react";
import FormButton from "../shared/FormButton";
import GenerationModal, {
  GenerationPreview,
} from "../shared/GenerationModal";
import { ServiceOption } from "../shared/ServiceSelector";
import { AiGeneration } from "../shared/GenerationViewer";

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

interface ImageDetailSidebarProps {
  imageId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageDetailSidebar({
  imageId,
  isOpen,
  onClose,
}: ImageDetailSidebarProps) {
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [currentDescription, setCurrentDescription] =
    useState<AiGeneration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "history">(
    "description"
  );

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

  useEffect(() => {
    if (!isOpen || !imageId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch image file metadata
        const fileResponse = await fetch(`/api/image/${imageId}`);
        if (!fileResponse.ok) {
          const contentType = fileResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await fileResponse.json();
            throw new Error(errorData.error || "Failed to fetch image file");
          } else {
            throw new Error(`Failed to fetch image file: ${fileResponse.statusText}`);
          }
        }
        const fileData = await fileResponse.json();
        setImageFile(fileData);

        // Fetch current description if available
        const currentDescriptionId = (fileData as any).currentDescriptionId;
        if (currentDescriptionId) {
          const descriptionResponse = await fetch(
            `/api/image/${imageId}/description/current`
          );
          if (descriptionResponse.ok) {
            const contentType = descriptionResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const descriptionData = await descriptionResponse.json();
              setCurrentDescription(descriptionData);
            }
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

    fetchData();
  }, [isOpen, imageId]);

  // Auto-refresh description history when history tab becomes active
  useEffect(() => {
    if (activeTab === "history" && imageId && !loading && isOpen) {
      fetchDescriptionVersions();
    }
  }, [activeTab, imageId, loading, isOpen]);

  const fetchDescriptionVersions = useCallback(async () => {
    if (!imageId) return;
    try {
      const response = await fetch(`/api/image/${imageId}/generations`);
      if (response.ok) {
        const allDescriptions = await response.json();
        const descriptions = allDescriptions.filter((gen: any) =>
          gen.generation_type?.includes("description")
        );
        setDescriptionVersions(descriptions);
      }
    } catch (err) {
      console.error("Error fetching description versions:", err);
    }
  }, [imageId]);

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
  };

  const handleRunDescription = async (serviceKey: string) => {
    if (!imageId) return;

    setGeneratingModels((prev) => ({ ...prev, [serviceKey]: true }));
    setError(null);

    try {
      const response = await fetch(`/api/image/${imageId}/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: serviceKey }),
      });

      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate description");
        } else {
          throw new Error(`Failed to generate description: ${response.statusText}`);
        }
      }

      const result = await response.json();
      setDescriptionResults((prev) => ({
        ...prev,
        [serviceKey]: {
          text: result.text_content || result.description || "",
          metadata: result.metadata || {},
        },
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate description"
      );
    } finally {
      setGeneratingModels((prev) => ({ ...prev, [serviceKey]: false }));
    }
  };

  const handleSaveDescription = async (
    serviceKey: string,
    generationId: string
  ) => {
    setSavedGenerationIds((prev) => ({
      ...prev,
      [serviceKey]: generationId,
    }));
    await fetchDescriptionVersions();
    // Refresh current description
    if (imageId) {
      const fileResponse = await fetch(`/api/image/${imageId}`);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const currentDescriptionId = (fileData as any).currentDescriptionId;
        if (currentDescriptionId) {
          const descriptionResponse = await fetch(
            `/api/image/${imageId}/description/current`
          );
          if (descriptionResponse.ok) {
            const descriptionData = await descriptionResponse.json();
            setCurrentDescription(descriptionData);
          }
        }
      }
    }
  };

  const handleSetCurrentDescription = async (generationId: string) => {
    if (!imageId) return;

    try {
      const response = await fetch(
        `/api/image/${imageId}/description/${generationId}/set-current`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to set current description");
      }

      await fetchDescriptionVersions();
      // Refresh current description
      const descriptionResponse = await fetch(
        `/api/image/${imageId}/description/current`
      );
      if (descriptionResponse.ok) {
        const descriptionData = await descriptionResponse.json();
        setCurrentDescription(descriptionData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set current description"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="h-full flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <>
            <Tabs
              tabs={[
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
                setActiveTab(tabId as "description" | "history")
              }
            >
              {activeTab === "description" && (
                <div className="p-6 space-y-6">
                  {/* CTA at top */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Description
                    </h3>
                    <FormButton
                      onClick={handleOpenDescriptionModal}
                      variant="primary"
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5"
                    >
                      <Wand2 className="w-4 h-4" />
                      Transcribe/Describe
                    </FormButton>
                  </div>

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
                          {new Date(
                            currentDescription.created_at
                          ).toLocaleString()}
                          {currentDescription.metadata?.model && (
                            <span>
                              {" "}
                              • Model: {currentDescription.metadata.model}
                            </span>
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
                <div className="p-6 space-y-6">
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
                                  {new Date(
                                    version.created_at
                                  ).toLocaleString()}
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
          </>
        )}
      </div>

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
    </>
  );
}

