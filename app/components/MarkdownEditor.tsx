'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  className = '',
  placeholder = 'Enter markdown...',
  minHeight = '200px',
  maxHeight = '60vh',
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  if (readOnly) {
    // Read-only mode: always show preview
    return (
      <div className={`markdown-preview ${className}`} style={{ maxHeight, overflowY: 'auto' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {value || 'No content'}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Markdown Editor
        </div>
        <button
          onClick={() => setIsPreview(!isPreview)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
          title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
        >
          {isPreview ? (
            <>
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </>
          )}
        </button>
      </div>
      {isPreview ? (
        <div
          className="markdown-preview border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900"
          style={{ minHeight, maxHeight, overflowY: 'auto' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {value || 'No content'}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          style={{ minHeight, maxHeight }}
        />
      )}
    </div>
  );
}

