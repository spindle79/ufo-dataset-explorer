"use client";

import { useState } from "react";
import Breadcrumbs from "../components/shared/Breadcrumbs";
import Tabs from "../components/Tabs";
import FileUploadTab from "../components/image/FileUploadTab";
import UrlUploadTab from "../components/image/UrlUploadTab";
import CsvUploadTab from "../components/image/CsvUploadTab";
import ImageViewer from "../components/image/ImageViewer";
import UploadSuccessModal from "../components/shared/UploadSuccessModal";
import {
  ClipboardList,
  Upload,
  Link as LinkIcon,
  FileSpreadsheet,
  Image as ImageIcon,
} from "lucide-react";

export default function ImagePage() {
  const [activeTab, setActiveTab] = useState("viewer");
  const [refreshKey, setRefreshKey] = useState(0);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [uploadedItemId, setUploadedItemId] = useState<string | null>(null);
  const [uploadedItemName, setUploadedItemName] = useState<string | null>(null);

  const tabs = [
    { id: "viewer", label: "Viewer", icon: <ClipboardList /> },
    { id: "upload", label: "Upload File", icon: <Upload /> },
    { id: "url", label: "Add URL", icon: <LinkIcon /> },
    { id: "csv", label: "Upload CSV", icon: <FileSpreadsheet /> },
  ];

  const handleUploadSuccess = (result: { id: string; type: "image" }) => {
    setUploadedItemId(result.id);
    setUploadedItemName(null); // Could fetch name if needed
    setSuccessModalOpen(true);
    // Trigger refresh of viewer
    setRefreshKey((prev) => prev + 1);
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
    setUploadedItemId(null);
    setUploadedItemName(null);
    // Switch to viewer tab to see the new file
    setActiveTab("viewer");
  };

  return (
    <main className="min-h-screen p-8 min-w-screen">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Image",
              icon: <ImageIcon className="w-4 h-4" />,
            },
          ]}
          className="mb-4"
        />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Image Upload Tool</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload image files, add from URLs, or bulk import from CSV
          </p>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "viewer" && <ImageViewer key={refreshKey} />}
          {activeTab === "upload" && (
            <FileUploadTab onSuccess={handleUploadSuccess} />
          )}
          {activeTab === "url" && (
            <UrlUploadTab onSuccess={handleUploadSuccess} />
          )}
          {activeTab === "csv" && (
            <CsvUploadTab
              onUploadSuccess={() => {
                setRefreshKey((prev) => prev + 1);
                setActiveTab("viewer");
              }}
            />
          )}
        </Tabs>
      </div>

      {uploadedItemId && (
        <UploadSuccessModal
          isOpen={successModalOpen}
          onClose={handleCloseSuccessModal}
          itemId={uploadedItemId}
          itemType="image"
          itemName={uploadedItemName || undefined}
        />
      )}
    </main>
  );
}
