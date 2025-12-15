"use client";

import React from "react";

interface VideoPlayerProps {
  src: string;
  mimeType?: string;
  title?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  onEnded?: () => void;
  onPause?: () => void;
  showTitle?: boolean;
  showBorder?: boolean;
  poster?: string;
}

export default function VideoPlayer({
  src,
  mimeType,
  title,
  autoPlay = false,
  controls = true,
  className = "",
  onEnded,
  onPause,
  showTitle = true,
  showBorder = true,
  poster,
}: VideoPlayerProps) {
  const containerClasses = showBorder
    ? `border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900 ${className}`
    : className;

  return (
    <div className={containerClasses}>
      {showTitle && title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <video
        controls={controls}
        src={src}
        autoPlay={autoPlay}
        onEnded={onEnded}
        onPause={onPause}
        poster={poster}
        className="w-full rounded"
      >
        {mimeType && <source src={src} type={mimeType} />}
        Your browser does not support the video element.
      </video>
    </div>
  );
}
