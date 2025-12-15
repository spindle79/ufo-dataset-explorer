'use client';

import { useState } from 'react';
import { decodeFileName } from '../../lib/utils';

interface CsvUploadTabProps {
  onUploadSuccess: () => void;
}

export default function CsvUploadTab({ onUploadSuccess }: CsvUploadTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/audio/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(true);
      setResult(data);
      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      setTimeout(() => {
        setSuccess(false);
        setResult(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">CSV Format</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Your CSV file should have a column with URLs. The first row should be headers.
          Expected format: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">url</code> or <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">audio_url</code> or <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">link</code>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CSV File
          </label>
          <input
            type="file"
            id="csv-file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-blue-900 dark:file:text-blue-300"
            disabled={uploading}
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Selected: {decodeFileName(file.name)}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && result && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-medium">Processing complete!</p>
            <p className="text-sm mt-1">
              Successfully added: {result.success} | Failed: {result.failed}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Processing...' : 'Process CSV'}
        </button>
      </form>
    </div>
  );
}

