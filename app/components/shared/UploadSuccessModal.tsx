"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, AudioLines, FileText, X } from "lucide-react";
import Modal from "./Modal";

interface UploadSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: "audio" | "pdf" | "scrape";
  itemName?: string;
  onRetranscribe?: () => void; // For audio
  onReExtract?: () => void; // For PDF
}

export default function UploadSuccessModal({
  isOpen,
  onClose,
  itemId,
  itemType,
  itemName,
  onRetranscribe,
  onReExtract,
}: UploadSuccessModalProps) {
  const router = useRouter();

  const handleViewDetail = () => {
    let path = "";
    switch (itemType) {
      case "audio":
        path = `/audio/${itemId}`;
        break;
      case "pdf":
        path = `/pdf/${itemId}`;
        break;
      case "scrape":
        path = `/scrape/${itemId}`;
        break;
    }
    router.push(path);
    onClose();
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case "audio":
        return "Audio file";
      case "pdf":
        return "PDF file";
      case "scrape":
        return "Scraped page";
      default:
        return "Item";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Successful"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Success Icon and Message */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getItemTypeLabel()} uploaded successfully!
            </h3>
            {itemName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {itemName}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleViewDetail}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <Eye className="w-5 h-5" />
            View Detail
          </button>

          {itemType === "audio" && onRetranscribe && (
            <button
              onClick={() => {
                onRetranscribe();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
            >
              <AudioLines className="w-5 h-5" />
              Transcribe Audio
            </button>
          )}

          {itemType === "pdf" && onReExtract && (
            <button
              onClick={() => {
                onReExtract();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              <FileText className="w-5 h-5" />
              Extract Text
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
