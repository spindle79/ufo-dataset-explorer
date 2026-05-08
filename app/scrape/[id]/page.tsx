"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Tabs from "../../components/Tabs";
import Breadcrumbs from "../../components/shared/Breadcrumbs";
import MarkdownEditor from "../../components/MarkdownEditor";
import type { ScrapedPage } from "../../lib/supabase-types";
import {
  Loader2,
  ExternalLink,
  FileText,
  Code,
  Link2,
  Music,
  Video,
  File,
  Eye,
  Plus,
  Upload,
  AudioLines,
  RefreshCw,
  Wand2,
} from "lucide-react";
import AudioViewer from "../../components/audio/AudioViewer";
import PdfViewer from "../../components/pdf/PdfViewer";
import ImageViewer from "../../components/image/ImageViewer";
import PeopleTab from "../../components/entities/PeopleTab";
import LocationsTab from "../../components/entities/LocationsTab";
import CompaniesTab from "../../components/entities/CompaniesTab";
import ProgramsTab from "../../components/entities/ProgramsTab";
import { Users, MapPin, Building2, FolderKanban, Image as ImageIcon } from "lucide-react";

export default function ScrapeDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [page, setPage] = useState<ScrapedPage | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "markdown"
    | "html"
    | "links"
    | "audio"
    | "video"
    | "images"
    | "documents"
    | "people"
    | "locations"
    | "companies"
    | "programs"
  >("markdown");
  const [links, setLinks] = useState<
    Array<{
      url: string;
      type: "link" | "image" | "audio" | "video" | "iframe" | "pdf" | "text";
      text?: string;
      alt?: string;
      existingRecord?: {
        type: "scrape" | "audio" | "pdf" | "video" | "image";
        id: string;
        href: string;
      };
    }>
  >([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [audioFileIds, setAudioFileIds] = useState<string[]>([]);
  const [pdfFileIds, setPdfFileIds] = useState<string[]>([]);
  const [imageFileIds, setImageFileIds] = useState<string[]>([]);
  const [rescraping, setRescraping] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch page metadata
        const pageResponse = await fetch(`/api/scrape/${id}`);
        if (!pageResponse.ok) {
          throw new Error("Failed to fetch page");
        }
        const pageData = await pageResponse.json();
        setPage(pageData);

        // Fetch content
        const contentResponse = await fetch(`/api/scrape/${id}/content`);
        if (contentResponse.ok) {
          const contentText = await contentResponse.text();
          setContent(contentText);
        }

        // Fetch HTML
        const htmlResponse = await fetch(`/api/scrape/${id}/html`);
        if (htmlResponse.ok) {
          const htmlText = await htmlResponse.text();
          setHtml(htmlText);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Load links when switching to a links-related tab
  useEffect(() => {
    if (
      id &&
      (activeTab === "links" ||
        activeTab === "audio" ||
        activeTab === "video" ||
        activeTab === "images" ||
        activeTab === "documents")
    ) {
      const fetchLinks = async () => {
        setLoadingLinks(true);
        try {
          const response = await fetch(`/api/scrape/${id}/links`);
          if (response.ok) {
            const data = await response.json();
            const allLinks = data.links || [];
            setLinks(allLinks);

            // Extract audio, PDF, and image file IDs from links
            const audioIds = allLinks
              .filter(
                (link: (typeof allLinks)[0]) =>
                  link.existingRecord?.type === "audio"
              )
              .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);
            const pdfIds = allLinks
              .filter(
                (link: (typeof allLinks)[0]) =>
                  link.existingRecord?.type === "pdf"
              )
              .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);
            const imageIds = allLinks
              .filter(
                (link: (typeof allLinks)[0]) =>
                  link.existingRecord?.type === "image"
              )
              .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);

            setAudioFileIds(audioIds);
            setPdfFileIds(pdfIds);
            setImageFileIds(imageIds);
          } else {
            setLinks([]);
            setAudioFileIds([]);
            setPdfFileIds([]);
            setImageFileIds([]);
          }
        } catch (err) {
          console.error("Error loading links:", err);
          setLinks([]);
          setAudioFileIds([]);
          setPdfFileIds([]);
          setImageFileIds([]);
        } finally {
          setLoadingLinks(false);
        }
      };
      fetchLinks();
    }
  }, [id, activeTab]);

  const handleRescrape = async () => {
    if (!id || rescraping) return;

    setRescraping(true);
    setError(null);

    try {
      const response = await fetch(`/api/scrape/${id}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to re-scrape page");
      }

      const updatedPage = await response.json();

      // Update local state with new data
      setPage(updatedPage);

      // Refresh content and HTML
      const contentResponse = await fetch(`/api/scrape/${id}/content`);
      if (contentResponse.ok) {
        const contentText = await contentResponse.text();
        setContent(contentText);
      }

      const htmlResponse = await fetch(`/api/scrape/${id}/html`);
      if (htmlResponse.ok) {
        const htmlText = await htmlResponse.text();
        setHtml(htmlText);
      }

      // Refresh links if we're on a links-related tab
      if (
        activeTab === "links" ||
        activeTab === "audio" ||
        activeTab === "video" ||
        activeTab === "images" ||
        activeTab === "documents"
      ) {
        const linksResponse = await fetch(`/api/scrape/${id}/links`);
        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          const allLinks = linksData.links || [];
          setLinks(allLinks);

          // Update audio, PDF, and image file IDs
          const audioIds = allLinks
            .filter(
              (link: (typeof allLinks)[0]) =>
                link.existingRecord?.type === "audio"
            )
            .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);
          const pdfIds = allLinks
            .filter(
              (link: (typeof allLinks)[0]) =>
                link.existingRecord?.type === "pdf"
            )
            .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);
          const imageIds = allLinks
            .filter(
              (link: (typeof allLinks)[0]) =>
                link.existingRecord?.type === "image"
            )
            .map((link: (typeof allLinks)[0]) => link.existingRecord!.id);

          setAudioFileIds(audioIds);
          setPdfFileIds(pdfIds);
          setImageFileIds(imageIds);
        }
      }

      // Show success message if relationships were created
      if (updatedPage.relationshipsCreated > 0) {
        console.log(
          `Re-scrape complete: Created ${updatedPage.relationshipsCreated} new relationships, skipped ${updatedPage.relationshipsSkipped} duplicates`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-scrape page");
    } finally {
      setRescraping(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!id || generatingDescription || !content) return;

    setGeneratingDescription(true);
    setError(null);

    try {
      const response = await fetch(`/api/scrape/${id}/generate-description`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-5-nano" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate description");
      }

      const result = await response.json();

      // Update local state with the new description
      if (result.page) {
        setPage(result.page);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate description"
      );
    } finally {
      setGeneratingDescription(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Scrape",
              href: "/scrape",
              icon: <FileText className="w-4 h-4" />,
            },
            { label: "Loading..." },
          ]}
          className="mb-4"
        />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading...
          </span>
        </div>
      </main>
    );
  }

  if (error || !page) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Scrape",
              href: "/scrape",
              icon: <FileText className="w-4 h-4" />,
            },
            { label: "Error" },
          ]}
          className="mb-4"
        />
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "Page not found"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 min-w-screen">
      <Breadcrumbs
        items={[
          {
            label: "Scrape",
            href: "/scrape",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            label: page.title || "Page",
            icon: <FileText className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{page.title}</h1>
          <button
            onClick={handleRescrape}
            disabled={rescraping}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Re-scrape this page and process any new links"
          >
            {rescraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Re-scraping...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Re-scrape</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-start gap-2 mb-2">
          {page.description ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
              {page.description}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic flex-1">
              No description available
            </p>
          )}
          {content && content.trim().length > 0 && (
            <button
              onClick={handleGenerateDescription}
              disabled={generatingDescription}
              className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              title={
                page.description
                  ? "Regenerate description using AI"
                  : "Generate description using AI"
              }
            >
              {generatingDescription ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-md"
            title={page.url}
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{page.url}</span>
          </a>
          <span>•</span>
          <span>Scraped: {new Date(page.scraped_date).toLocaleString()}</span>
        </div>
        {page.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {page.categories.map((cat, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      <Tabs
        tabs={[
          {
            id: "markdown",
            label: "Markdown",
            icon: <FileText className="w-4 h-4" />,
          },
          ...(html
            ? [
                {
                  id: "html",
                  label: "HTML",
                  icon: <Code className="w-4 h-4" />,
                },
              ]
            : []),
          {
            id: "links",
            label: "Links",
            icon: <Link2 className="w-4 h-4" />,
          },
          {
            id: "audio",
            label: "Audio",
            icon: <Music className="w-4 h-4" />,
          },
          {
            id: "video",
            label: "Video",
            icon: <Video className="w-4 h-4" />,
          },
          {
            id: "images",
            label: "Images",
            icon: <ImageIcon className="w-4 h-4" />,
          },
          {
            id: "documents",
            label: "Documents",
            icon: <File className="w-4 h-4" />,
          },
          {
            id: "people",
            label: "People",
            icon: <Users className="w-4 h-4" />,
          },
          {
            id: "locations",
            label: "Locations",
            icon: <MapPin className="w-4 h-4" />,
          },
          {
            id: "companies",
            label: "Companies",
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            id: "programs",
            label: "Programs",
            icon: <FolderKanban className="w-4 h-4" />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) =>
          setActiveTab(
            tabId as
              | "markdown"
              | "html"
              | "links"
              | "audio"
              | "video"
              | "images"
              | "documents"
              | "people"
              | "locations"
              | "companies"
              | "programs"
          )
        }
      >
        {activeTab === "markdown" ? (
          content ? (
            <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
              <MarkdownEditor value={content} readOnly={true} />
            </div>
          ) : (
            <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">
                Content not available
              </p>
            </div>
          )
        ) : activeTab === "html" ? (
          html ? (
            <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono">
                <code>{html}</code>
              </pre>
            </div>
          ) : (
            <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">
                HTML content not available
              </p>
            </div>
          )
        ) : activeTab === "audio" ? (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading audio files...
                </span>
              </div>
            ) : audioFileIds.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No audio files linked from this scrape
              </p>
            ) : (
              <AudioViewer
                filterIds={audioFileIds}
                defaultViewMode="condensed"
              />
            )}
          </div>
        ) : activeTab === "images" ? (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading images...
                </span>
              </div>
            ) : imageFileIds.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No images linked from this scrape
              </p>
            ) : (
              <ImageViewer
                filterIds={imageFileIds}
                defaultViewMode="condensed"
              />
            )}
          </div>
        ) : activeTab === "documents" ? (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading documents...
                </span>
              </div>
            ) : pdfFileIds.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No documents linked from this scrape
              </p>
            ) : (
              <PdfViewer filterIds={pdfFileIds} defaultViewMode="condensed" />
            )}
          </div>
        ) : (
          <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading links...
                </span>
              </div>
            ) : activeTab === "links" || activeTab === "video" ? (
              (() => {
                // Filter links by type based on active tab
                let filteredLinks = links;
                if (activeTab === "links") {
                  filteredLinks = links.filter(
                    (link) => link.type === "link" || link.type === "iframe"
                  );
                } else {
                  // activeTab === "video"
                  filteredLinks = links.filter((link) => link.type === "video");
                }

                if (filteredLinks.length === 0) {
                  return (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No {activeTab} found
                    </p>
                  );
                }

                return (
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
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredLinks.map((link, idx) => (
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
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {link.text && (
                                <div
                                  className="truncate max-w-xs"
                                  title={link.text}
                                >
                                  {link.text}
                                </div>
                              )}
                              {link.alt && (
                                <div
                                  className="truncate max-w-xs"
                                  title={link.alt}
                                >
                                  Alt: {link.alt}
                                </div>
                              )}
                              {!link.text && !link.alt && (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {link.existingRecord ? (
                                <a
                                  href={link.existingRecord.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                >
                                  <span>
                                    Already processed (
                                    {link.existingRecord.type})
                                  </span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400">
                                  Not processed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : null}
          </div>
        )}
        {activeTab === "people" && (
          <PeopleTab 
            content={content}
            sourceType="scrape"
            sourceId={id}
          />
        )}
        {activeTab === "locations" && (
          <LocationsTab 
            content={content}
            sourceType="scrape"
            sourceId={id}
          />
        )}
        {activeTab === "companies" && (
          <CompaniesTab 
            content={content}
            sourceType="scrape"
            sourceId={id}
          />
        )}
        {activeTab === "programs" && (
          <ProgramsTab 
            content={content}
            sourceType="scrape"
            sourceId={id}
          />
        )}
      </Tabs>
    </main>
  );
}
