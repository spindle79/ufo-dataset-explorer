"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, Music, Video, ExternalLink, Eye, Trash2, Maximize2 } from "lucide-react";
import type { DomainMediaItem } from "@/lib/scrape-access";
import { formatDate } from "@/lib/file-operations";
import ImagePreviewModal from "./ImagePreviewModal";
import SlideInSidebar from "../shared/SlideInSidebar";
import ImageDetailSidebar from "./ImageDetailSidebar";

interface MediaCardProps {
  item: DomainMediaItem;
  onDelete?: (id: string, type: string) => void;
  deleting?: boolean;
}

export default function MediaCard({ item, onDelete, deleting = false }: MediaCardProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getTypeIcon = () => {
    switch (item.type) {
      case "pdf":
        return <FileText className="w-6 h-6" />;
      case "image":
        return <ImageIcon className="w-6 h-6" />;
      case "audio":
        return <Music className="w-6 h-6" />;
      case "video":
        return <Video className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case "pdf":
        return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400";
      case "image":
        return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400";
      case "audio":
        return "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400";
      case "video":
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  const getDetailUrl = () => {
    switch (item.type) {
      case "pdf":
        return `/pdf/${item.id}`;
      case "image":
        return `/image/${item.id}`;
      case "audio":
        return `/audio/${item.id}`;
      case "video":
        return `/video/${item.id}`;
      default:
        return "#";
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "image") {
      setSidebarOpen(true);
    } else {
      router.push(getDetailUrl());
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && !deleting) {
      onDelete(item.id, item.type);
    }
  };

  const title = item.fileName || item.url.split("/").pop() || `Untitled ${item.type}`;
  const isImage = item.type === "image";
  // For discovered images, use the proxy endpoint to bypass CORS; otherwise use the API endpoint
  const imageUrl = isImage
    ? item.status === "discovered"
      ? `/api/image/proxy?url=${encodeURIComponent(item.url)}`
      : `/api/image/${item.id}/file`
    : null;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          {/* Thumbnail/Icon */}
          <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 group cursor-pointer">
            {isImage && imageUrl && !imageError ? (
              <>
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewOpen(true);
                  }}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                  title="Preview image"
                  type="button"
                >
                  <div className="bg-black bg-opacity-50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </button>
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getTypeColor()}`}>
                {getTypeIcon()}
              </div>
            )}
          </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-white line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            From: {item.sourcePageTitle}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDate(item.discoveredAt)}</span>
          <span className={`px-2 py-1 rounded ${getTypeColor()}`}>
            {item.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleView}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Open URL"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        </div>
      </div>

      {isImage && (
        <>
          <ImagePreviewModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            imageUrl={
              item.status === "discovered"
                ? item.url
                : `/api/image/${item.id}/file`
            }
            title={title}
          />
          <SlideInSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            title={title}
            width="w-[30vw]"
          >
            <ImageDetailSidebar
              imageId={item.id}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          </SlideInSidebar>
        </>
      )}
      {!isImage && imageUrl && (
        <ImagePreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          imageUrl={imageUrl}
          title={title}
        />
      )}
    </>
  );
}

