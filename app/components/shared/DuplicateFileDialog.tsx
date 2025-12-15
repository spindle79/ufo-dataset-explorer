"use client";

import Modal from "./Modal";

interface DuplicateFileInfo {
  id: string;
  fileName: string;
  fileSize?: number;
  uploadedDate: string;
  description?: string;
}

interface DuplicateFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  duplicate: DuplicateFileInfo;
  onCancel: () => void;
  onReplace: () => void;
  isReplacing?: boolean;
}

export default function DuplicateFileDialog({
  isOpen,
  onClose,
  duplicate,
  onCancel,
  onReplace,
  isReplacing = false,
}: DuplicateFileDialogProps) {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate File Detected"
      maxWidth="md"
      showCloseButton={!isReplacing}
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          A file with the same name and size already exists in the system.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">
              File Name:
            </span>{" "}
            <span className="text-gray-700 dark:text-gray-300">
              {duplicate.fileName}
            </span>
          </div>
          {duplicate.fileSize && (
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">
                File Size:
              </span>{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {formatFileSize(duplicate.fileSize)}
              </span>
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">
              Uploaded:
            </span>{" "}
            <span className="text-gray-700 dark:text-gray-300">
              {formatDate(duplicate.uploadedDate)}
            </span>
          </div>
          {duplicate.description && (
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">
                Description:
              </span>{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {duplicate.description || "No description"}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          What would you like to do?
        </p>

        <div className="flex gap-3 justify-end pt-4">
          <button
            onClick={onCancel}
            disabled={isReplacing}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onReplace}
            disabled={isReplacing}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isReplacing ? "Replacing..." : "Replace Existing File"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
