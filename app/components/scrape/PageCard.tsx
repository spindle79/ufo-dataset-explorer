"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink, Trash2, Eye, Maximize2 } from "lucide-react";
import type { ScrapedPage } from "@/lib/supabase-types";
import { formatDate } from "@/lib/file-operations";
import ImagePreviewModal from "./ImagePreviewModal";

interface PageCardProps {
  page: ScrapedPage & { firstImageId?: string | null };
  onDelete?: (id: string) => void;
  deleting?: boolean;
}

export default function PageCard({ page, onDelete, deleting = false }: PageCardProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const hasImage = !!page.firstImageId;
  const imageUrl = hasImage ? `/api/image/${page.firstImageId}/file` : null;

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/scrape/${page.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && !deleting) {
      onDelete(page.id);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          {/* Thumbnail/Icon */}
          <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 group">
            {hasImage && imageUrl && !imageError ? (
              <>
                <img
                  src={imageUrl}
                  alt={page.title}
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
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-white line-clamp-2 mb-1">
            {page.title}
          </h3>
          {page.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {page.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDate(page.scraped_date)}</span>
          {page.domain && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              {page.domain}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleView}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="View page"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        </div>
      </div>

      {hasImage && imageUrl && (
        <ImagePreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          imageUrl={imageUrl}
          title={page.title}
        />
      )}
    </>
  );
}

