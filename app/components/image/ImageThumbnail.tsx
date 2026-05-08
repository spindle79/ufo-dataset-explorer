"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageFile } from "@/lib/image-types";
import { decodeFileName } from "@/lib/utils";
import { Eye, Image as ImageIcon } from "lucide-react";
import Tooltip from "../shared/Tooltip";

interface ImageThumbnailProps {
  file: ImageFile;
}

export default function ImageThumbnail({ file }: ImageThumbnailProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  // For discovered images, try to use the originalUrl if available
  const imageSrc =
    file.status === "discovered" && file.originalUrl
      ? file.originalUrl
      : `/api/image/${file.id}/file`;

  // Show placeholder if discovered without originalUrl, or if there's an error
  if ((file.status === "discovered" && !file.originalUrl) || imageError) {
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <Tooltip
      id={`thumbnail-${file.id}`}
      content="Click to view <b>details</b>"
      html
    >
      <button
        onClick={() => router.push(`/image/${file.id}`)}
        className="block relative group"
      >
        <img
          src={imageSrc}
          alt={decodeFileName(file.fileName)}
          className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded transition-opacity flex items-center justify-center">
          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    </Tooltip>
  );
}

