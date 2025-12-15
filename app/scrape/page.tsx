"use client";

import { useState } from "react";
import Navigation from "../components/Navigation";
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
} from "lucide-react";

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
        <Navigation showBackButton={true} />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Web Scraper Tool</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Scrape web pages and convert them to markdown. Add URLs manually,
            paste HTML snippets, or bulk import from CSV.
          </p>
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
