"use client";

import { useState } from "react";
import CategoryInput from "../shared/CategoryInput";

interface HtmlInputTabProps {
  onUploadSuccess: () => void;
}

export default function HtmlInputTab({ onUploadSuccess }: HtmlInputTabProps) {
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    id?: string;
    error?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!htmlSnippet.trim()) {
      setError("Please enter an HTML snippet");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const response = await fetch("/api/scrape/html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: htmlSnippet,
          title: title || undefined,
          description,
          categories,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const data = await response.json();
      setSuccess(true);
      setResult(data);
      setHtmlSnippet("");
      setSourceUrl("");
      setTitle("");
      setDescription("");
      setCategories([]);
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      setTimeout(() => {
        setSuccess(false);
        setResult(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="sourceUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Source URL (optional)
          </label>
          <input
            type="url"
            id="sourceUrl"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="https://example.com/page (where this HTML came from)"
            disabled={uploading}
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Optional: Enter the URL where this HTML snippet came from. This is
            for reference only and won't be scraped.
          </p>
        </div>

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Title (optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter a title for this HTML snippet..."
            disabled={uploading}
          />
        </div>

        <div>
          <label
            htmlFor="htmlSnippet"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            HTML Snippet
          </label>
          <textarea
            id="htmlSnippet"
            value={htmlSnippet}
            onChange={(e) => setHtmlSnippet(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
            placeholder="<div>Paste your HTML snippet here...</div>"
            disabled={uploading}
            required
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Paste your HTML snippet here. It will be processed and converted to
            markdown.
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter a description for this HTML snippet..."
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Categories (optional)
          </label>
          <CategoryInput
            value={categories}
            onChange={setCategories}
            disabled={uploading}
            placeholder="Type a category and press Enter..."
            apiPath="/api/scrape/categories"
          />
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
              {result.success
                ? "HTML snippet processed successfully"
                : `Processing failed: ${result.error || "Unknown error"}`}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!htmlSnippet.trim() || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Processing..." : "Process HTML"}
        </button>
      </form>
    </div>
  );
}
