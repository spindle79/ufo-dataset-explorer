'use client';

import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { AiGeneration } from './GenerationViewer';
import MarkdownEditor from '../MarkdownEditor';

interface VersionHistoryProps {
  versions: AiGeneration[];
  currentGenerationId: string | null;
  onSetCurrent: (generationId: string) => void;
  onClose?: () => void;
  className?: string;
}

export default function VersionHistory({
  versions,
  currentGenerationId,
  onSetCurrent,
  onClose,
  className = '',
}: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  if (versions.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-500 dark:text-gray-400">No versions found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {versions.map((gen) => (
        <div
          key={gen.id}
          className={`border rounded p-3 ${
            currentGenerationId === gen.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Version {gen.version}</span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                  {gen.metadata?.service || gen.generation_type?.replace(/^(transcript|extraction)-/, '') || 'unknown'}
                </span>
                <span>•</span>
                <span>{new Date(gen.created_at).toLocaleString()}</span>
                {currentGenerationId === gen.id && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                    Current
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentGenerationId !== gen.id && (
                <button
                  onClick={() => onSetCurrent(gen.id)}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Set as Current
                </button>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {gen.text_content ? (
              <div>
                <MarkdownEditor
                  value={gen.text_content}
                  readOnly={true}
                  maxHeight={expandedVersions.has(gen.id) ? '60vh' : '8rem'}
                  className="text-sm"
                />
                {gen.text_content.length > 500 && (
                  <button
                    onClick={() => {
                      setExpandedVersions(prev => {
                        const next = new Set(prev);
                        if (next.has(gen.id)) {
                          next.delete(gen.id);
                        } else {
                          next.add(gen.id);
                        }
                        return next;
                      });
                    }}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {expandedVersions.has(gen.id) ? 'Show Less' : 'Show Full Text'}
                  </button>
                )}
              </div>
            ) : (
              <span className="text-gray-400">No text content</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

