"use client";

import { useRouter } from "next/navigation";
import { Globe, FileText, Image as ImageIcon, Music, Video } from "lucide-react";

interface DomainCardProps {
  domain: string;
  pageCount: number;
  documentCount: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
}

export default function DomainCard({
  domain,
  pageCount,
  documentCount,
  imageCount,
  audioCount,
  videoCount,
}: DomainCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/scrape/domains/${encodeURIComponent(domain)}`);
  };

  const totalItems = pageCount + documentCount + imageCount + audioCount + videoCount;

  return (
    <button
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 text-left w-full border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate max-w-xs">
                {domain}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalItems} total item{totalItems !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {pageCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <FileText className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{pageCount}</span>
            </div>
          )}
          {documentCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <FileText className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{documentCount}</span>
            </div>
          )}
          {imageCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <ImageIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{imageCount}</span>
            </div>
          )}
          {audioCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <Music className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{audioCount}</span>
            </div>
          )}
          {videoCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <Video className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{videoCount}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

