"use client";

import { useState } from "react";
import CategoryInput from "../shared/CategoryInput";

interface UrlInputTabProps {
  onUploadSuccess: () => void;
}

export default function UrlInputTab({ onUploadSuccess }: UrlInputTabProps) {
  const [urls, setUrls] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urls.trim()) {
      setError("Please enter at least one URL");
      return;
    }

    // Split by newlines and validate
    const urlArray = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlArray.length === 0) {
      setError("Please enter at least one valid URL");
      return;
    }

    // Validate all URLs
    const invalidUrls = urlArray.filter((url) => !validateUrl(url));
    if (invalidUrls.length > 0) {
      setError(`Invalid URLs: ${invalidUrls.join(", ")}`);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const response = await fetch("/api/scrape/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: urlArray,
          description,
          categories,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Scraping failed");
      }

      const data = await response.json();
      setSuccess(true);
      setResult(data);
      setUrls("");
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
      setError(err instanceof Error ? err.message : "Scraping failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="urls"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            URLs (one per line)
          </label>
          <textarea
            id="urls"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
            placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
            disabled={uploading}
            required
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter one URL per line. All URLs will be scraped and converted to
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
            placeholder="Enter a description for these scraped pages..."
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
            <p className="font-medium">Scraping complete!</p>
            <p className="text-sm mt-1">
              Successfully scraped: {result.success} | Failed: {result.failed} |
              Total: {result.total}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!urls.trim() || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Scraping..." : "Scrape URLs"}
        </button>
      </form>
    </div>
  );
}
