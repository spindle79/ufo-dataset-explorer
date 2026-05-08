"use client";

import React, { useState, useEffect } from "react";
import DomainCard from "./DomainCard";
import CardGrid from "./CardGrid";
import { Loader2 } from "lucide-react";

export interface DomainWithCounts {
  domain: string;
  pageCount: number;
  documentCount: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
}

export default function ScrapeViewer() {
  const [domains, setDomains] = useState<DomainWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scrape/domains");
      if (!response.ok) {
        throw new Error("Failed to fetch domains");
      }
      const data = await response.json();
      setDomains(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load domains"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Loading domains...
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
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          Web Sources ({domains.length} domain{domains.length !== 1 ? "s" : ""})
        </h3>
      </div>

      <CardGrid
        loading={loading}
        emptyMessage="No domains found. Add some URLs to get started!"
      >
        {domains.map((domain) => (
          <DomainCard
            key={domain.domain}
            domain={domain.domain}
            pageCount={domain.pageCount}
            documentCount={domain.documentCount}
            imageCount={domain.imageCount}
            audioCount={domain.audioCount}
            videoCount={domain.videoCount}
          />
        ))}
      </CardGrid>
    </div>
  );
}
