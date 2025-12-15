"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ScrapedPage } from "../../lib/supabase-types";
import Modal from "../shared/Modal";
import UploadSuccessModal from "../shared/UploadSuccessModal";
import UrlUploadTab from "../audio/UrlUploadTab";
import PdfUrlUploadTab from "../pdf/UrlUploadTab";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Eye,
  Edit,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Minus,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Link2,
  Music,
  Video,
  Image,
  Plus,
  Loader2,
  FileText,
  File,
  Trash2,
  Upload,
  AudioLines,
  List,
  LayoutGrid,
  Maximize2,
} from "lucide-react";

type SortField = "title" | "scraped_date" | "url" | "description";
type SortOrder = "asc" | "desc";
type ViewMode = "condensed" | "normal" | "expanded";

export default function ScrapeViewer() {
  const router = useRouter();
  const [scrapedPages, setScrapedPages] = useState<ScrapedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("scraped_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [viewingHtml, setViewingHtml] = useState<string | null>(null);
  const [viewingTab, setViewingTab] = useState<"markdown" | "html" | "links">(
    "markdown"
  );
  const [viewingLinks, setViewingLinks] = useState<
    Array<{
      url: string;
      type: "link" | "image" | "audio" | "video" | "iframe" | "pdf" | "text";
      text?: string;
      alt?: string;
      existingRecord?: {
        type: "scrape" | "audio" | "pdf";
        id: string;
        href: string;
      };
    }>
  >([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);
  const [transcribingUrl, setTranscribingUrl] = useState<string | null>(null);
  const [processingPdfUrl, setProcessingPdfUrl] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorModalId, setErrorModalId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedLinkTypes, setExpandedLinkTypes] = useState<Set<string>>(
    new Set()
  );
  // Upload modal states
  const [audioUploadModalOpen, setAudioUploadModalOpen] = useState(false);
  const [audioUploadUrl, setAudioUploadUrl] = useState<string | null>(null);
  const [pdfUploadModalOpen, setPdfUploadModalOpen] = useState(false);
  const [pdfUploadUrl, setPdfUploadUrl] = useState<string | null>(null);
  // Success modal states
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [uploadedItemId, setUploadedItemId] = useState<string | null>(null);
  const [uploadedItemType, setUploadedItemType] = useState<
    "audio" | "pdf" | null
  >(null);

  const fetchScrapedPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scrape");
      if (!response.ok) {
        throw new Error("Failed to fetch scraped pages");
      }
      const data = await response.json();
      setScrapedPages(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load scraped pages"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapedPages();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedPages = [...scrapedPages].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case "title":
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case "scraped_date":
        aVal = new Date(a.scraped_date).getTime();
        bVal = new Date(b.scraped_date).getTime();
        break;
      case "url":
        aVal = a.url.toLowerCase();
        bVal = b.url.toLowerCase();
        break;
      case "description":
        aVal = (a.description || "").toLowerCase();
        bVal = (b.description || "").toLowerCase();
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleRefresh = async (page: ScrapedPage) => {
    setRefreshingId(page.id);
    setError(null);
    try {
      const response = await fetch(`/api/scrape/${page.id}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Refresh failed");
      }

      // Refresh the list
      await fetchScrapedPages();

      // If we're viewing this page, refresh the content too
      if (viewingId === page.id) {
        const [contentResponse, htmlResponse] = await Promise.all([
          fetch(`/api/scrape/${page.id}/content`),
          fetch(`/api/scrape/${page.id}/html`),
        ]);
        if (contentResponse.ok) {
          const content = await contentResponse.text();
          setViewingContent(content);
        }
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          setViewingHtml(html);
        }
        // If we're on the links tab, reload links
        if (viewingTab === "links") {
          await loadLinks(page.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh page");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleView = async (id: string) => {
    if (viewingId === id) {
      setViewingId(null);
      setViewingContent(null);
      setViewingHtml(null);
      setViewingLinks([]);
      setViewingTab("markdown");
    } else {
      setViewingId(id);
      try {
        const [contentResponse, htmlResponse] = await Promise.all([
          fetch(`/api/scrape/${id}/content`),
          fetch(`/api/scrape/${id}/html`),
        ]);

        if (contentResponse.ok) {
          const content = await contentResponse.text();
          setViewingContent(content);
        } else {
          setViewingContent("Failed to load content");
        }

        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          setViewingHtml(html);
        }
      } catch (err) {
        setViewingContent("Error loading content");
      }
    }
  };

  const loadLinks = async (id: string) => {
    setLoadingLinks(true);
    try {
      const response = await fetch(`/api/scrape/${id}/links`);
      if (response.ok) {
        const data = await response.json();
        setViewingLinks(data.links || []);
        // Reset expanded types when loading new links
        setExpandedLinkTypes(new Set());
      } else {
        setViewingLinks([]);
      }
    } catch (err) {
      console.error("Error loading links:", err);
      setViewingLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleViewLinks = async (id: string) => {
    // If not already viewing this page, open it first
    if (viewingId !== id) {
      setViewingId(id);
      try {
        const [contentResponse, htmlResponse] = await Promise.all([
          fetch(`/api/scrape/${id}/content`),
          fetch(`/api/scrape/${id}/html`),
        ]);

        if (contentResponse.ok) {
          const content = await contentResponse.text();
          setViewingContent(content);
        } else {
          setViewingContent("Failed to load content");
        }

        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          setViewingHtml(html);
        }
      } catch (err) {
        setViewingContent("Error loading content");
      }
    }

    // Switch to links tab and load links
    setViewingTab("links");
    await loadLinks(id);
  };

  const toggleLinkType = (type: string) => {
    setExpandedLinkTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleScrapeUrl = async (url: string) => {
    setScrapingUrl(url);
    try {
      const response = await fetch("/api/scrape/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: [url] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape URL");
      }

      const data = await response.json();
      if (data.results && data.results.length > 0 && data.results[0].success) {
        // Refresh the links to show the new record
        if (viewingId) {
          await loadLinks(viewingId);
        }
        // Refresh the scraped pages list
        await fetchScrapedPages();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape URL");
    } finally {
      setScrapingUrl(null);
    }
  };

  const handleOpenAudioUploadModal = (url: string) => {
    setAudioUploadUrl(url);
    setAudioUploadModalOpen(true);
  };

  const handleAudioUploadSuccess = async (result: {
    id: string;
    type: "audio";
  }) => {
    setAudioUploadModalOpen(false);
    setUploadedItemId(result.id);
    setUploadedItemType("audio");
    setSuccessModalOpen(true);
    // Wait a bit for the database to update, then refresh the links
    if (viewingId) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadLinks(viewingId);
    }
  };

  const handleTranscribeAudio = async (url: string, audioId: string) => {
    setTranscribingUrl(url);
    try {
      const transcribeResponse = await fetch(
        `/api/audio/${audioId}/transcribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ service: "whisper" }),
        }
      );

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || "Failed to transcribe audio");
      }

      // Optionally refresh links
      if (viewingId) {
        await loadLinks(viewingId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transcribe audio"
      );
    } finally {
      setTranscribingUrl(null);
    }
  };

  const handleOpenPdfUploadModal = (url: string) => {
    setPdfUploadUrl(url);
    setPdfUploadModalOpen(true);
  };

  const handlePdfUploadSuccess = async (result: {
    id: string;
    type: "pdf";
  }) => {
    setPdfUploadModalOpen(false);
    setUploadedItemId(result.id);
    setUploadedItemType("pdf");
    setSuccessModalOpen(true);
    // Wait a bit for the database to update, then refresh the links
    if (viewingId) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadLinks(viewingId);
    }
  };

  const handleProcessPdf = async (url: string, pdfId: string) => {
    setProcessingPdfUrl(url);
    try {
      const response = await fetch(`/api/pdf/${pdfId}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ service: "openai" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract PDF");
      }

      // Optionally refresh links
      if (viewingId) {
        await loadLinks(viewingId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process PDF");
    } finally {
      setProcessingPdfUrl(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    setError(null);
    try {
      const response = await fetch(`/api/scrape/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete scraped page");
      }

      // If we're viewing this page, close the viewer
      if (viewingId === id) {
        setViewingId(null);
        setViewingContent(null);
        setViewingHtml(null);
        setViewingLinks([]);
        setViewingTab("markdown");
      }

      // Refresh the list
      await fetchScrapedPages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete scraped page"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <Minus className="w-4 h-4 text-gray-400" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  // Get padding classes based on view mode
  const getPaddingClasses = (type: "header" | "body"): string => {
    if (type === "header") {
      switch (viewMode) {
        case "condensed":
          return "px-3 py-2";
        case "normal":
          return "px-4 py-2.5";
        case "expanded":
          return "px-6 py-3";
        default:
          return "px-4 py-2.5";
      }
    } else {
      switch (viewMode) {
        case "condensed":
          return "px-3 py-2";
        case "normal":
          return "px-4 py-2.5";
        case "expanded":
          return "px-6 py-4";
        default:
          return "px-4 py-2.5";
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Loading scraped pages...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Scraped Pages ({scrapedPages.length})
        </h3>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("condensed")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "condensed"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="Condensed View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("normal")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "normal"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="Normal View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("expanded")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "expanded"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="Expanded View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {scrapedPages.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No scraped pages yet. Add some URLs to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-2">
                    Title
                    <SortIcon field="title" />
                  </div>
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                  onClick={() => handleSort("url")}
                >
                  <div className="flex items-center gap-2">
                    URL
                    <SortIcon field="url" />
                  </div>
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                  onClick={() => handleSort("scraped_date")}
                >
                  <div className="flex items-center gap-2">
                    Scraped Date
                    <SortIcon field="scraped_date" />
                  </div>
                </th>
                <th
                  className={`${getPaddingClasses(
                    "header"
                  )} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedPages.map((page) => (
                <React.Fragment key={page.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{page.title}</span>
                        <button
                          onClick={() => handleViewLinks(page.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="View Links"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} text-sm text-gray-500 dark:text-gray-400`}
                    >
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs flex items-center gap-1"
                      >
                        {page.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm text-gray-500 dark:text-gray-400`}
                    >
                      {formatDate(page.scraped_date)}
                    </td>
                    <td
                      className={`${getPaddingClasses(
                        "body"
                      )} whitespace-nowrap text-sm`}
                    >
                      <div className="flex gap-3 items-center">
                        {page.error && (
                          <button
                            onClick={() => setErrorModalId(page.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                            title="View Error"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/scrape/${page.id}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRefresh(page)}
                          disabled={refreshingId === page.id}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh/Re-scrape"
                        >
                          <RefreshCw
                            className={`w-5 h-5 ${
                              refreshingId === page.id ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(page.id)}
                          disabled={deletingId === page.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          {deletingId === page.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded details row - shown only in expanded mode */}
                  {viewMode === "expanded" && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td
                        colSpan={4}
                        className={`${getPaddingClasses("body")}`}
                      >
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                              Description:
                            </span>
                            <p className="text-gray-700 dark:text-gray-300">
                              {page.description || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                              Categories:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {page.categories.length > 0 ? (
                                page.categories.map((cat, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                                  >
                                    {cat}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {viewingId === page.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td
                        colSpan={4}
                        className={`${getPaddingClasses("body")}`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 border-b border-gray-300 dark:border-gray-600">
                              <button
                                onClick={() => setViewingTab("markdown")}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                  viewingTab === "markdown"
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                }`}
                              >
                                Markdown
                              </button>
                              <button
                                onClick={() => setViewingTab("html")}
                                disabled={!viewingHtml}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                  viewingTab === "html"
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                } ${
                                  !viewingHtml
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                HTML
                              </button>
                              <button
                                onClick={() => {
                                  if (viewingTab !== "links") {
                                    loadLinks(page.id);
                                    setViewingTab("links");
                                  }
                                }}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                  viewingTab === "links"
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                }`}
                              >
                                Links
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                setViewingId(null);
                                setViewingContent(null);
                                setViewingHtml(null);
                                setViewingLinks([]);
                                setViewingTab("markdown");
                              }}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="max-h-[600px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
                            {viewingTab === "markdown" ? (
                              viewingContent ? (
                                <div className="prose dark:prose-invert max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {viewingContent}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400">
                                  Loading content...
                                </p>
                              )
                            ) : viewingTab === "html" ? (
                              viewingHtml ? (
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
                                  <code>{viewingHtml}</code>
                                </pre>
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400">
                                  HTML content not available
                                </p>
                              )
                            ) : (
                              <div className="w-full">
                                {loadingLinks ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                                      Loading links...
                                    </span>
                                  </div>
                                ) : viewingLinks.length === 0 ? (
                                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No links found
                                  </p>
                                ) : (
                                  (() => {
                                    // Group links by type
                                    const groupedLinks = viewingLinks.reduce(
                                      (acc, link) => {
                                        const type = link.type;
                                        if (!acc[type]) {
                                          acc[type] = [];
                                        }
                                        acc[type].push(link);
                                        return acc;
                                      },
                                      {} as Record<string, typeof viewingLinks>
                                    );

                                    const getTypeIcon = (type: string) => {
                                      switch (type) {
                                        case "link":
                                          return <Link2 className="w-4 h-4" />;
                                        case "audio":
                                          return <Music className="w-4 h-4" />;
                                        case "video":
                                          return <Video className="w-4 h-4" />;
                                        case "image":
                                          return <Image className="w-4 h-4" />;
                                        case "iframe":
                                          return (
                                            <ExternalLink className="w-4 h-4" />
                                          );
                                        case "pdf":
                                          return (
                                            <FileText className="w-4 h-4" />
                                          );
                                        case "text":
                                          return <File className="w-4 h-4" />;
                                        default:
                                          return <Link2 className="w-4 h-4" />;
                                      }
                                    };

                                    const getTypeLabel = (type: string) => {
                                      switch (type) {
                                        case "link":
                                          return "Link";
                                        case "audio":
                                          return "Audio";
                                        case "video":
                                          return "Video";
                                        case "image":
                                          return "Image";
                                        case "iframe":
                                          return "Iframe";
                                        case "pdf":
                                          return "PDF";
                                        case "text":
                                          return "Text";
                                        default:
                                          return "Link";
                                      }
                                    };

                                    // Sort types by count (descending) then alphabetically
                                    const sortedTypes = Object.keys(
                                      groupedLinks
                                    ).sort((a, b) => {
                                      const countDiff =
                                        groupedLinks[b].length -
                                        groupedLinks[a].length;
                                      if (countDiff !== 0) return countDiff;
                                      return a.localeCompare(b);
                                    });

                                    return (
                                      <div className="space-y-2">
                                        {sortedTypes.map((type) => {
                                          const links = groupedLinks[type];
                                          const isExpanded =
                                            expandedLinkTypes.has(type);
                                          const typeIcon = getTypeIcon(type);
                                          const typeLabel = getTypeLabel(type);

                                          return (
                                            <div
                                              key={type}
                                              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                                            >
                                              <button
                                                onClick={() =>
                                                  toggleLinkType(type)
                                                }
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                                              >
                                                <div className="flex items-center gap-3">
                                                  {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                  ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                  )}
                                                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                                    {typeIcon}
                                                    <span className="font-medium">
                                                      {typeLabel}
                                                    </span>
                                                  </div>
                                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    ({links.length})
                                                  </span>
                                                </div>
                                              </button>
                                              {isExpanded && (
                                                <div className="overflow-x-auto">
                                                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                                      <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                          URL
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                          Info
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                          Status
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                          Actions
                                                        </th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                      {links.map(
                                                        (link, idx) => (
                                                          <tr
                                                            key={idx}
                                                            className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                                          >
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                              <a
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center gap-1"
                                                              >
                                                                {link.url}
                                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                              </a>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                              {link.text && (
                                                                <div
                                                                  className="truncate max-w-xs"
                                                                  title={
                                                                    link.text
                                                                  }
                                                                >
                                                                  {link.text}
                                                                </div>
                                                              )}
                                                              {link.alt && (
                                                                <div
                                                                  className="truncate max-w-xs"
                                                                  title={
                                                                    link.alt
                                                                  }
                                                                >
                                                                  Alt:{" "}
                                                                  {link.alt}
                                                                </div>
                                                              )}
                                                              {!link.text &&
                                                                !link.alt && (
                                                                  <span className="text-gray-400">
                                                                    —
                                                                  </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                              {link.existingRecord ? (
                                                                <a
                                                                  href={
                                                                    link
                                                                      .existingRecord
                                                                      .href
                                                                  }
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                                                >
                                                                  <span>
                                                                    Already
                                                                    processed (
                                                                    {
                                                                      link
                                                                        .existingRecord
                                                                        .type
                                                                    }
                                                                    )
                                                                  </span>
                                                                  <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                              ) : (
                                                                <span className="text-gray-400">
                                                                  Not processed
                                                                </span>
                                                              )}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                              <div className="flex gap-2">
                                                                {link.type ===
                                                                  "link" &&
                                                                  !link.existingRecord && (
                                                                    <button
                                                                      onClick={() =>
                                                                        handleScrapeUrl(
                                                                          link.url
                                                                        )
                                                                      }
                                                                      disabled={
                                                                        scrapingUrl ===
                                                                        link.url
                                                                      }
                                                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                      title="Add for scraping"
                                                                    >
                                                                      {scrapingUrl ===
                                                                      link.url ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                                      ) : (
                                                                        <Plus className="w-5 h-5" />
                                                                      )}
                                                                    </button>
                                                                  )}
                                                                {link.type ===
                                                                  "audio" &&
                                                                  !link.existingRecord && (
                                                                    <button
                                                                      onClick={() =>
                                                                        handleOpenAudioUploadModal(
                                                                          link.url
                                                                        )
                                                                      }
                                                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                                                      title="Upload audio file"
                                                                    >
                                                                      <Upload className="w-5 h-5" />
                                                                    </button>
                                                                  )}
                                                                {link.type ===
                                                                  "audio" &&
                                                                  link.existingRecord &&
                                                                  link
                                                                    .existingRecord
                                                                    .type ===
                                                                    "audio" && (
                                                                    <>
                                                                      <a
                                                                        href={
                                                                          link
                                                                            .existingRecord
                                                                            .href
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                                                                        title="View audio file"
                                                                      >
                                                                        <Eye className="w-5 h-5" />
                                                                      </a>
                                                                      <button
                                                                        onClick={() =>
                                                                          handleTranscribeAudio(
                                                                            link.url,
                                                                            link.existingRecord!
                                                                              .id
                                                                          )
                                                                        }
                                                                        disabled={
                                                                          transcribingUrl ===
                                                                          link.url
                                                                        }
                                                                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        title="Transcribe audio"
                                                                      >
                                                                        {transcribingUrl ===
                                                                        link.url ? (
                                                                          <Loader2 className="w-5 h-5 animate-spin" />
                                                                        ) : (
                                                                          <AudioLines className="w-5 h-5" />
                                                                        )}
                                                                      </button>
                                                                    </>
                                                                  )}
                                                                {link.type ===
                                                                  "pdf" &&
                                                                  !link.existingRecord && (
                                                                    <button
                                                                      onClick={() =>
                                                                        handleOpenPdfUploadModal(
                                                                          link.url
                                                                        )
                                                                      }
                                                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                                                      title="Upload PDF file"
                                                                    >
                                                                      <Upload className="w-5 h-5" />
                                                                    </button>
                                                                  )}
                                                                {link.type ===
                                                                  "pdf" &&
                                                                  link.existingRecord &&
                                                                  link
                                                                    .existingRecord
                                                                    .type ===
                                                                    "pdf" && (
                                                                    <>
                                                                      <a
                                                                        href={
                                                                          link
                                                                            .existingRecord
                                                                            .href
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                                                                        title="View PDF file"
                                                                      >
                                                                        <Eye className="w-5 h-5" />
                                                                      </a>
                                                                      <button
                                                                        onClick={() =>
                                                                          handleProcessPdf(
                                                                            link.url,
                                                                            link.existingRecord!
                                                                              .id
                                                                          )
                                                                        }
                                                                        disabled={
                                                                          processingPdfUrl ===
                                                                          link.url
                                                                        }
                                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        title="Extract text from PDF"
                                                                      >
                                                                        {processingPdfUrl ===
                                                                        link.url ? (
                                                                          <Loader2 className="w-5 h-5 animate-spin" />
                                                                        ) : (
                                                                          <FileText className="w-5 h-5" />
                                                                        )}
                                                                      </button>
                                                                    </>
                                                                  )}
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        )
                                                      )}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Modal */}
      {errorModalId &&
        (() => {
          const page = scrapedPages.find((p) => p.id === errorModalId);
          if (!page || !page.error) return null;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Scraping Error
                  </h3>
                  <button
                    onClick={() => setErrorModalId(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                    {page.url}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Error Message:
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                    <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
                      {page.error}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setErrorModalId(null)}
                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      setErrorModalId(null);
                      await handleRefresh(page);
                    }}
                    disabled={refreshingId === page.id}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        refreshingId === page.id ? "animate-spin" : ""
                      }`}
                    />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId &&
        (() => {
          const page = scrapedPages.find((p) => p.id === confirmDeleteId);
          if (!page) return null;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Confirm Delete
                  </h3>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    disabled={deletingId === page.id}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Are you sure you want to delete this scraped page?
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {page.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                      {page.url}
                    </p>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deletingId === page.id}
                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    disabled={deletingId === page.id}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {deletingId === page.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Audio Upload Modal */}
      {audioUploadModalOpen && audioUploadUrl && (
        <Modal
          isOpen={audioUploadModalOpen}
          onClose={() => {
            setAudioUploadModalOpen(false);
            setAudioUploadUrl(null);
          }}
          title="Upload Audio File"
        >
          <UrlUploadTab
            initialValues={{ url: audioUploadUrl }}
            onSuccess={handleAudioUploadSuccess}
          />
        </Modal>
      )}

      {/* PDF Upload Modal */}
      {pdfUploadModalOpen && pdfUploadUrl && (
        <Modal
          isOpen={pdfUploadModalOpen}
          onClose={() => {
            setPdfUploadModalOpen(false);
            setPdfUploadUrl(null);
          }}
          title="Upload PDF File"
        >
          <PdfUrlUploadTab
            initialValues={{ url: pdfUploadUrl }}
            onSuccess={handlePdfUploadSuccess}
          />
        </Modal>
      )}

      {/* Success Modal */}
      {uploadedItemId && uploadedItemType && (
        <UploadSuccessModal
          isOpen={successModalOpen}
          onClose={() => {
            setSuccessModalOpen(false);
            setUploadedItemId(null);
            setUploadedItemType(null);
          }}
          itemId={uploadedItemId}
          itemType={uploadedItemType}
        />
      )}
    </div>
  );
}
