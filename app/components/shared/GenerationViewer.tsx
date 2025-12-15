'use client';

import React from 'react';
import MarkdownEditor from '../MarkdownEditor';

export interface AiGeneration {
  id: string;
  version: number;
  generation_type: string;
  text_content: string | null;
  created_at: string;
  metadata: any;
}

interface GenerationViewerProps {
  generation: AiGeneration | null;
  maxHeight?: string;
  showMetadata?: boolean;
  className?: string;
}

export default function GenerationViewer({
  generation,
  maxHeight = '60vh',
  showMetadata = true,
  className = '',
}: GenerationViewerProps) {
  if (!generation) {
    return (
      <div className={`flex-1 border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No content available</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      {showMetadata && (
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Version {generation.version} •{' '}
          {new Date(generation.created_at).toLocaleString()}
          {generation.metadata?.service && (
            <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
              {generation.metadata.service}
            </span>
          )}
        </div>
      )}
      <MarkdownEditor
        value={generation.text_content || 'No content available'}
        readOnly={true}
        maxHeight={maxHeight}
        className="flex-1"
      />
    </div>
  );
}

