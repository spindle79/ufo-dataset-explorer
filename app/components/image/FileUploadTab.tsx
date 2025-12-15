"use client";

import { useState, useEffect } from "react";
import CategoryInput from "../shared/CategoryInput";
import DuplicateFileDialog from "../shared/DuplicateFileDialog";
import { decodeFileName } from "../../lib/utils";

interface FileUploadTabProps {
  initialValues?: {
    description?: string;
    categories?: string[];
  };
  onSuccess?: (result: { id: string; type: "image" }) => void;
  onUploadSuccess?: () => void; // Legacy support
}

interface DuplicateInfo {
  id: string;
  fileName: string;
  fileSize?: number;
  uploadedDate: string;
  description?: string;
}

export default function FileUploadTab({
  initialValues,
  onSuccess,
  onUploadSuccess,
}: FileUploadTabProps) {
  const [file, setFile] = useState<File | null>(null);
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

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues?.description !== undefined) {
      setDescription(initialValues.description);
    }
    if (initialValues?.categories !== undefined) {
      setCategories(initialValues.categories);
    }
  }, [initialValues]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate image file
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const performUpload = async (
    replaceExisting: boolean,
    existingId?: string
  ) => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    if (replaceExisting) {
      setIsReplacing(true);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("description", description);
      formData.append("categories", categories.join(","));
      if (replaceExisting && existingId) {
        formData.append("replaceExisting", "true");
        formData.append("existingId", existingId);
      }

      const response = await fetch("/api/image/upload", {
        method: "POST",
        body: formData,
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
      setFile(null);
      setDescription("");
      setCategories([]);
      setDuplicateInfo(null);

      // Call success callbacks
      if (onSuccess && uploadedId) {
        onSuccess({ id: uploadedId, type: "image" });
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
    await performUpload(false);
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
            htmlFor="file"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Image File
          </label>
          <input
            type="file"
            id="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-blue-900 dark:file:text-blue-300"
            disabled={uploading}
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Selected: {decodeFileName(file.name)} (
              {(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
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
            placeholder="Enter a description for this image file..."
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
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </form>
    </div>
  );
}
