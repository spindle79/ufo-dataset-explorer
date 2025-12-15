"use client";

import React from "react";

interface AudioPlayerProps {
  src: string;
  mimeType?: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
  onPause?: () => void;
  showTitle?: boolean;
  showBorder?: boolean;
}

export default function AudioPlayer({
  src,
  mimeType = "audio/mpeg",
  title,
  autoPlay = false,
  className = "",
  onEnded,
  onPause,
  showTitle = true,
  showBorder = true,
}: AudioPlayerProps) {
  const containerClasses = showBorder
    ? `border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900 ${className}`
    : className;

  return (
    <div className={containerClasses}>
      {showTitle && title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <audio
        controls
        src={src}
        autoPlay={autoPlay}
        onEnded={onEnded}
        onPause={onPause}
        className="w-full"
      >
        <source src={src} type={mimeType} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
