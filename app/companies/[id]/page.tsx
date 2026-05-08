"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "../../components/shared/Breadcrumbs";
import Tabs from "../../components/Tabs";
import { Loader2, ExternalLink, FileText, Music, Video, File, Building2, Info } from "lucide-react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  aliases: string[];
  created_at: string;
  updated_at: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [sources, setSources] = useState<
    Array<{
      type: string;
      id: string;
      created_at: string;
      item: any;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "sources">("details");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const companyResponse = await fetch(`/api/entities/companies/${id}`);
        if (!companyResponse.ok) {
          if (companyResponse.status === 404) {
            setError("Company not found");
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch company");
        }
        const companyData = await companyResponse.json();
        setCompany(companyData.company);

        const sourcesResponse = await fetch(`/api/entities/companies/${id}/sources`);
        if (sourcesResponse.ok) {
          const sourcesData = await sourcesResponse.json();
          setSources(sourcesData.sources || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load company");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const getSourceUrl = (source: { type: string; id: string }) => {
    switch (source.type) {
      case "pdf":
        return `/pdf/${source.id}`;
      case "audio":
        return `/audio/${source.id}`;
      case "video":
        return `/video/${source.id}`;
      case "scrape":
        return `/scrape/${source.id}`;
      default:
        return "#";
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <File className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "scrape":
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Companies",
              href: "/companies",
              icon: <Building2 className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="min-h-screen p-8 min-w-screen">
        <Breadcrumbs
          items={[
            {
              label: "Companies",
              href: "/companies",
              icon: <Building2 className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || "Company not found"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 min-w-screen">
      <Breadcrumbs
        items={[
          {
            label: "Companies",
            href: "/companies",
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            label: company.name,
            icon: <Building2 className="w-4 h-4" />,
          },
        ]}
        className="mb-4"
      />

      {/* Compact Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 truncate">
            <Building2 className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{company.name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex-shrink-0">
              Created:{" "}
              {company.created_at
                ? new Date(company.created_at).toLocaleDateString()
                : "—"}
            </span>
            <span className="flex-shrink-0">
              Updated:{" "}
              {company.updated_at
                ? new Date(company.updated_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "details", label: "Details", icon: <Info className="w-4 h-4" /> },
          { id: "sources", label: "Sources", icon: <FileText className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) =>
          setActiveTab(tabId as "details" | "sources")
        }
      >
        {activeTab === "details" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              {company.aliases && company.aliases.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Aliases
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {company.aliases.map((alias, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>{" "}
                  <span className="text-gray-900 dark:text-white">
                    {company.created_at
                      ? new Date(company.created_at).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Updated:</span>{" "}
                  <span className="text-gray-900 dark:text-white">
                    {company.updated_at
                      ? new Date(company.updated_at).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sources" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Source Items</h2>
              {sources.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No source items found. This company has not been extracted from any documents yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {sources.map((source, idx) => (
                    <Link
                      key={idx}
                      href={getSourceUrl(source)}
                      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="text-gray-600 dark:text-gray-400">
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {source.item?.title ||
                            source.item?.fileName ||
                            source.type}
                        </div>
                        {source.item?.url && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {source.item.url}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(source.created_at).toLocaleDateString()}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Tabs>
    </main>
  );
}

