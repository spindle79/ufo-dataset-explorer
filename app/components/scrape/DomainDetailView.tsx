"use client";

import { useState, useEffect } from "react";
import Tabs from "../../components/Tabs";
import PageCard from "./PageCard";
import MediaCard from "./MediaCard";
import CardGrid from "./CardGrid";
import type { ScrapedPage } from "@/lib/supabase-types";
import type { DomainMediaItem } from "@/lib/scrape-access";
import { FileText, Image as ImageIcon, Music, Video, File } from "lucide-react";
import { deleteScrapedPage } from "@/lib/scrape-access";

interface DomainDetailViewProps {
  domain: string;
}

export default function DomainDetailView({ domain }: DomainDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "pages" | "documents" | "images" | "audio" | "video"
  >("pages");
  const [pages, setPages] = useState<ScrapedPage[]>([]);
  const [documents, setDocuments] = useState<DomainMediaItem[]>([]);
  const [images, setImages] = useState<DomainMediaItem[]>([]);
  const [audio, setAudio] = useState<DomainMediaItem[]>([]);
  const [video, setVideo] = useState<DomainMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const encodedDomain = encodeURIComponent(domain);

      // Always fetch pages
      const pagesResponse = await fetch(`/api/scrape/domains/${encodedDomain}/pages`);
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        setPages(pagesData);
      }

      // Fetch media based on active tab
      if (activeTab === "documents") {
        const docsResponse = await fetch(`/api/scrape/domains/${encodedDomain}/documents`);
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData);
        }
      } else if (activeTab === "images") {
        const imagesResponse = await fetch(`/api/scrape/domains/${encodedDomain}/images`);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          setImages(imagesData);
        }
      } else if (activeTab === "audio") {
        const audioResponse = await fetch(`/api/scrape/domains/${encodedDomain}/audio`);
        if (audioResponse.ok) {
          const audioData = await audioResponse.json();
          setAudio(audioData);
        }
      } else if (activeTab === "video") {
        const videoResponse = await fetch(`/api/scrape/domains/${encodedDomain}/video`);
        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          setVideo(videoData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [domain, activeTab]);

  const handleDeletePage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/scrape/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete page");
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteMedia = async (id: string, type: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    setDeletingId(id);
    try {
      const endpoint = `/${type}/${id}`;
      const response = await fetch(`/api${endpoint}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs
        tabs={[
          {
            id: "pages",
            label: "Pages",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            id: "documents",
            label: "Documents",
            icon: <File className="w-4 h-4" />,
          },
          {
            id: "images",
            label: "Images",
            icon: <ImageIcon className="w-4 h-4" />,
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
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) =>
          setActiveTab(
            tabId as "pages" | "documents" | "images" | "audio" | "video"
          )
        }
      >
        {activeTab === "pages" && (
          <CardGrid
            loading={loading}
            emptyMessage="No pages found for this domain"
          >
            {pages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                onDelete={handleDeletePage}
                deleting={deletingId === page.id}
              />
            ))}
          </CardGrid>
        )}

        {activeTab === "documents" && (
          <CardGrid
            loading={loading}
            emptyMessage="No documents found for this domain"
          >
            {documents.map((doc) => (
              <MediaCard
                key={doc.id}
                item={doc}
                onDelete={handleDeleteMedia}
                deleting={deletingId === doc.id}
              />
            ))}
          </CardGrid>
        )}

        {activeTab === "images" && (
          <CardGrid
            loading={loading}
            emptyMessage="No images found for this domain"
          >
            {images.map((image) => (
              <MediaCard
                key={image.id}
                item={image}
                onDelete={handleDeleteMedia}
                deleting={deletingId === image.id}
              />
            ))}
          </CardGrid>
        )}

        {activeTab === "audio" && (
          <CardGrid
            loading={loading}
            emptyMessage="No audio files found for this domain"
          >
            {audio.map((audioFile) => (
              <MediaCard
                key={audioFile.id}
                item={audioFile}
                onDelete={handleDeleteMedia}
                deleting={deletingId === audioFile.id}
              />
            ))}
          </CardGrid>
        )}

        {activeTab === "video" && (
          <CardGrid
            loading={loading}
            emptyMessage="No video files found for this domain"
          >
            {video.map((videoFile) => (
              <MediaCard
                key={videoFile.id}
                item={videoFile}
                onDelete={handleDeleteMedia}
                deleting={deletingId === videoFile.id}
              />
            ))}
          </CardGrid>
        )}
      </Tabs>
    </div>
  );
}

