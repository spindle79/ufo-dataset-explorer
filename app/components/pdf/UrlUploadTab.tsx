"use client";

import { useState, useEffect } from "react";
import CategoryInput from "../shared/CategoryInput";
import DuplicateFileDialog from "../shared/DuplicateFileDialog";

interface UrlUploadTabProps {
  initialValues?: {
    url?: string;
    description?: string;
    categories?: string[];
  };
  onSuccess?: (result: { id: string; type: "pdf" }) => void;
  onUploadSuccess?: () => void; // Legacy support
  processFileId?: string; // If provided, processes existing file instead of creating new one
}

interface DuplicateInfo {
  id: string;
  fileName: string;
  fileSize?: number;
  uploadedDate: string;
  description?: string;
}

export default function UrlUploadTab({
  initialValues,
  onSuccess,
  onUploadSuccess,
  processFileId,
}: UrlUploadTabProps) {
  const [url, setUrl] = useState(initialValues?.url || "");
  const [description, setDescription] = useState(
    initialValues?.description || ""
  );
  const [categories, setCategories] = useState<string[]>(
    initialValues?.categories || []
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(
    null
  );
  const [isReplacing, setIsReplacing] = useState(false);
  const [skipDownload, setSkipDownload] = useState(false);

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues?.url !== undefined) {
      setUrl(initialValues.url);
    }
    if (initialValues?.description !== undefined) {
      setDescription(initialValues.description);
    }
    if (initialValues?.categories !== undefined) {
      setCategories(initialValues.categories);
    }
  }, [initialValues]);

  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const performUpload = async (
    replaceExisting: boolean,
    existingId?: string
  ) => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!validateUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    setUploading(true);
    setError(null);
    if (replaceExisting) {
      setIsReplacing(true);
    }

    try {
      const response = await fetch("/api/pdf/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          description,
          categories,
          replaceExisting,
          existingId,
          skipDownload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for duplicate file error
        if (response.status === 409 && errorData.error === "DUPLICATE_FILE") {
          setDuplicateInfo(errorData.duplicate);
          setUploading(false);
          setIsReplacing(false);
          return;
        }

        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      const uploadedId = result.id;

      // Reset form
      setUrl("");
      setDescription("");
      setCategories([]);
      setDuplicateInfo(null);

      // Call success callbacks
      if (onSuccess && uploadedId) {
        onSuccess({ id: uploadedId, type: "pdf" });
      }
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setIsReplacing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If processFileId is provided, process existing file instead of creating new one
    if (processFileId) {
      setUploading(true);
      setError(null);

      try {
        // Process the file with the URL from the form
        const processResponse = await fetch(
          `/api/pdf/${processFileId}/process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: url.trim(),
            }),
          }
        );

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          throw new Error(errorData.error || "Processing failed");
        }

        // Reset form
        setUrl("");
        setDescription("");
        setCategories([]);

        // Call success callbacks
        if (onSuccess) {
          onSuccess({ id: processFileId, type: "pdf" });
        }
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Processing failed");
      } finally {
        setUploading(false);
      }
    } else {
      // Original behavior: create new file
      await performUpload(false);
    }
  };

  const handleReplace = async () => {
    if (duplicateInfo) {
      await performUpload(true, duplicateInfo.id);
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicateInfo(null);
  };

  return (
    <div>
      <DuplicateFileDialog
        isOpen={!!duplicateInfo}
        onClose={handleCancelDuplicate}
        duplicate={
          duplicateInfo || {
            id: "",
            fileName: "",
            uploadedDate: "",
          }
        }
        onCancel={handleCancelDuplicate}
        onReplace={handleReplace}
        isReplacing={isReplacing}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            PDF File URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="https://example.com/document.pdf"
            disabled={uploading}
            required
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter a description for this PDF file..."
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Categories
          </label>
          <CategoryInput
            value={categories}
            onChange={setCategories}
            disabled={uploading}
            placeholder="Type a category and press Enter..."
            apiPath="/api/pdf/categories"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="skipDownload"
            checked={skipDownload}
            onChange={(e) => setSkipDownload(e.target.checked)}
            disabled={uploading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="skipDownload"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            Skip downloading file (URL-only)
          </label>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!url.trim() || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading
            ? processFileId
              ? "Processing..."
              : "Adding..."
            : processFileId
            ? "Process PDF"
            : "Add PDF from URL"}
        </button>
      </form>
    </div>
  );
}
