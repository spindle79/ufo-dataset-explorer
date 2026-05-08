"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageFile } from "@/lib/image-types";
import {
  includeFile,
  excludeFile,
  deleteFile as deleteFileOperation,
  processFile,
} from "@/lib/file-operations";
import { decodeFileName } from "@/lib/utils";
import IncludeButton from "../shared/IncludeButton";
import ViewDetailsButton from "../shared/ViewDetailsButton";
import EditButton from "../shared/EditButton";
import DownloadButton from "../shared/DownloadButton";
import ExcludeButton from "../shared/ExcludeButton";
import ProcessButton from "../shared/ProcessButton";
import DeleteButton from "../shared/DeleteButton";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import Modal from "../shared/Modal";

interface ImageActionButtonsProps {
  file: ImageFile;
  onRefresh?: () => Promise<void>;
  onError?: (error: string) => void;
}

export default function ImageActionButtons({
  file,
  onRefresh,
  onError,
}: ImageActionButtonsProps) {
  const router = useRouter();
  const [excludeConfirmFile, setExcludeConfirmFile] =
    useState<ImageFile | null>(null);
  const [processingFileId, setProcessingFileId] = useState<string | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isExcluded = (file as any).metadata?.excluded;

  const handleDownload = (id: string, fileName: string) => {
    const url = `/api/image/${id}/file`;
    const link = document.createElement("a");
    link.href = url;
    link.download = decodeFileName(fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExclude = (file: ImageFile) => {
    setExcludeConfirmFile(file);
  };

  const confirmExclude = async () => {
    if (!excludeConfirmFile) return;

    await excludeFile(
      excludeConfirmFile.id,
      "image",
      onRefresh || (async () => {}),
      onError || (() => {}),
      () => setExcludeConfirmFile(null)
    );
  };

  const handleInclude = async (file: ImageFile) => {
    await includeFile(
      file.id,
      "image",
      onRefresh || (async () => {}),
      onError || (() => {})
    );
  };

  const handleProcess = async (file: ImageFile) => {
    setProcessingFileId(file.id);
    onError?.(null as any);

    await processFile(
      file.id,
      "image",
      file.originalUrl || "",
      onRefresh || (async () => {}),
      onError || (() => {}),
      () => setProcessingFileId(null)
    );
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    onError?.(null as any);

    await deleteFileOperation(
      id,
      "image",
      onRefresh || (async () => {}),
      onError || (() => {}),
      () => setDeletingId(null)
    );
  };

  return (
    <>
      <div className="flex gap-3 items-center">
        {isExcluded ? (
          <IncludeButton onClick={() => handleInclude(file)} id={file.id} />
        ) : (
          <>
            <ViewDetailsButton
              onClick={() => router.push(`/image/${file.id}`)}
              id={file.id}
              itemType="image"
            />
            {(file.status === "pending" || file.status === "discovered") && (
              <ProcessButton
                onClick={() => handleProcess(file)}
                id={file.id}
                disabled={processingFileId === file.id}
                itemType="image"
              />
            )}
            <ExcludeButton
              onClick={() => handleExclude(file)}
              id={file.id}
            />
            <DeleteButton
              onClick={() => setConfirmDeleteId(file.id)}
              id={file.id}
              disabled={deletingId === file.id}
              itemType="image"
            />
            {file.status !== "discovered" && (
              <>
                <DownloadButton
                  onClick={() => handleDownload(file.id, file.fileName)}
                  id={file.id}
                  itemType="image"
                />
                <EditButton
                  onClick={() => router.push(`/image/${file.id}`)}
                  id={file.id}
                  itemType="image"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Exclude Confirmation Modal */}
      <Modal
        isOpen={excludeConfirmFile !== null}
        onClose={() => setExcludeConfirmFile(null)}
        title="Confirm Exclude"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to exclude this file from the table?
          </p>
          {excludeConfirmFile && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {decodeFileName(excludeConfirmFile.fileName)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setExcludeConfirmFile(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmExclude}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Exclude
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        itemName={
          confirmDeleteId
            ? decodeFileName(file.fileName)
            : undefined
        }
        itemType="image"
        loading={deletingId === confirmDeleteId}
      />
    </>
  );
}

