"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "../../../components/shared/Breadcrumbs";
import DomainDetailView from "../../../components/scrape/DomainDetailView";
import { FileText, Globe, Loader2, Home, ExternalLink } from "lucide-react";

export default function DomainDetailPage() {
  const params = useParams();
  const domain = params.domain as string;
  const decodedDomain = decodeURIComponent(domain);

  const [domainInfo, setDomainInfo] = useState<{
    domain: string;
    pageCount: number;
    documentCount: number;
    imageCount: number;
    audioCount: number;
    videoCount: number;
    homepage?: {
      id?: string;
      url: string;
      title?: string;
      description?: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDomainInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/scrape/domains/${domain}`);
        if (!response.ok) {
          throw new Error("Failed to fetch domain information");
        }
        const data = await response.json();
        setDomainInfo({
          domain: data.domain,
          pageCount: data.pageCount,
          documentCount: data.documentCount,
          imageCount: data.imageCount,
          audioCount: data.audioCount,
          videoCount: data.videoCount,
          homepage: data.homepage,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load domain");
      } finally {
        setLoading(false);
      }
    };

    if (domain) {
      fetchDomainInfo();
    }
  }, [domain]);

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
            Loading domain...
          </span>
        </div>
      </main>
    );
  }

  if (error || !domainInfo) {
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
          {error || "Domain not found"}
        </div>
      </main>
    );
  }

  const totalItems =
    domainInfo.pageCount +
    domainInfo.documentCount +
    domainInfo.imageCount +
    domainInfo.audioCount +
    domainInfo.videoCount;

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
            label: decodedDomain,
            icon: <Globe className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{decodedDomain}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalItems} total item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {domainInfo.pageCount > 0 && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
              {domainInfo.pageCount} Page{domainInfo.pageCount !== 1 ? "s" : ""}
            </span>
          )}
          {domainInfo.documentCount > 0 && (
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
              {domainInfo.documentCount} Document{domainInfo.documentCount !== 1 ? "s" : ""}
            </span>
          )}
          {domainInfo.imageCount > 0 && (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
              {domainInfo.imageCount} Image{domainInfo.imageCount !== 1 ? "s" : ""}
            </span>
          )}
          {domainInfo.audioCount > 0 && (
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
              {domainInfo.audioCount} Audio File{domainInfo.audioCount !== 1 ? "s" : ""}
            </span>
          )}
          {domainInfo.videoCount > 0 && (
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-sm">
              {domainInfo.videoCount} Video{domainInfo.videoCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Homepage Card */}
      {domainInfo.homepage && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                <Home className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {domainInfo.homepage.title || "Homepage"}
                    </h3>
                    {domainInfo.homepage.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {domainInfo.homepage.description}
                      </p>
                    )}
                    <a
                      href={domainInfo.homepage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{domainInfo.homepage.url}</span>
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    </a>
                  </div>
                  {domainInfo.homepage.id && (
                    <a
                      href={`/scrape/${domainInfo.homepage.id}`}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
                    >
                      <FileText className="w-4 h-4" />
                      View Page
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DomainDetailView domain={decodedDomain} />
    </main>
  );
}

