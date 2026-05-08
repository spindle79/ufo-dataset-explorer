"use client";

import { useState } from "react";
import Breadcrumbs from "../components/shared/Breadcrumbs";
import Tabs from "../components/Tabs";
import UrlInputTab from "../components/scrape/UrlInputTab";
import HtmlInputTab from "../components/scrape/HtmlInputTab";
import CsvUploadTab from "../components/scrape/CsvUploadTab";
import ScrapeViewer from "../components/scrape/ScrapeViewer";
import {
  ClipboardList,
  Link as LinkIcon,
  FileSpreadsheet,
  Code,
  GitMerge,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function ScrapePage() {
  const [activeTab, setActiveTab] = useState("viewer");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: "viewer", label: "Viewer", icon: <ClipboardList /> },
    { id: "url", label: "Add URLs", icon: <LinkIcon /> },
    { id: "html", label: "Paste HTML", icon: <Code /> },
    { id: "csv", label: "Upload CSV", icon: <FileSpreadsheet /> },
  ];

  const handleUploadSuccess = () => {
    // Trigger refresh of viewer
    setRefreshKey((prev) => prev + 1);
    // Switch to viewer tab to see the new pages
    setActiveTab("viewer");
  };

  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Scrape",
              icon: <FileText className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-4">Web Scraper Tool</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Scrape web pages and convert them to markdown. Add URLs manually,
                paste HTML snippets, or bulk import from CSV.
              </p>
            </div>
            <Link
              href="/scrape/duplicates"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <GitMerge className="w-4 h-4" />
              Review Duplicates
            </Link>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "viewer" && <ScrapeViewer key={refreshKey} />}
          {activeTab === "url" && (
            <UrlInputTab onUploadSuccess={handleUploadSuccess} />
          )}
          {activeTab === "html" && (
            <HtmlInputTab onUploadSuccess={handleUploadSuccess} />
          )}
          {activeTab === "csv" && (
            <CsvUploadTab onUploadSuccess={handleUploadSuccess} />
          )}
        </Tabs>
      </div>
    </main>
  );
}
