"use client";

import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useEffect } from "react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setImageError(false);
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="relative w-full h-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
            onClick={handleZoomOut}
            className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        {title && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <h3 className="bg-black bg-opacity-50 text-white px-4 py-2 rounded text-sm">
              {title}
            </h3>
          </div>
        )}

        <div className="max-w-full max-h-full overflow-auto">
          {imageError ? (
            <div className="text-white text-center p-8">
              <p>Failed to load image</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={title || "Preview"}
              className="max-w-full max-h-full object-contain"
              style={{ transform: `scale(${zoom})` }}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

