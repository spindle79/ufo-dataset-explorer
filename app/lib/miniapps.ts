import React, { ReactElement } from "react";
import { Miniapp } from "../components/MiniappCard";
import {
  Rocket,
  Music,
  BarChart3,
  FileText,
  Database,
  Globe,
  Video,
  Image as ImageIcon,
  Users,
  MapPin,
  FolderKanban,
  LucideIcon,
} from "lucide-react";

/**
 * Centralized registry of all miniapps in the application.
 * This ensures DRY principles - all miniapp metadata is defined in one place.
 */
export interface MiniappData {
  id: string;
  title: string;
  description: string;
  href: string;
  iconComponent: LucideIcon;
  badge?: string;
}

const miniappsData: MiniappData[] = [
  {
    id: "dataset-explorer",
    title: "Dataset Explorer",
    description:
      "Explore approximately 327,000 UFO sighting reports from the Hugging Face dataset with search, filters, and pagination.",
    href: "/explorer",
    iconComponent: Rocket,
    badge: "Available",
  },
  {
    id: "audio-upload",
    title: "Audio Upload Tool",
    description:
      "Upload audio files, add from URLs, or bulk import from CSV. Manage and organize your audio collection with descriptions and categories.",
    href: "/audio",
    iconComponent: Music,
    badge: "Available",
  },
  {
    id: "udb-explorer",
    title: "UDB Database Explorer",
    description:
      "Explore the Larry Hatch UFO Database (UDB) - a curated collection of historical UFO sighting records with detailed metadata, credibility ratings, and strangeness scores.",
    href: "/udb",
    iconComponent: BarChart3,
    badge: "Available",
  },
  {
    id: "pdf-parser",
    title: "PDF Parser Tool",
    description:
      "Upload PDF files, add from URLs, or bulk import from CSV. Manage and organize your PDF collection with descriptions and categories.",
    href: "/pdf",
    iconComponent: FileText,
    badge: "Available",
  },
  {
    id: "ufo-clustered",
    title: "UFO Clustered Dataset",
    description:
      "Explore the cleaned and unified UFO sightings dataset (~327k rows) from Hugging Face. Merges several publicly available UFO sighting datasets from Kaggle into one cleaned, standardized, and enriched file.",
    href: "/ufo-clustered",
    iconComponent: Database,
    badge: "Available",
  },
  {
    id: "web-scraper",
    title: "Web Scraper Tool",
    description:
      "Scrape web pages and convert them to markdown. Add URLs manually (one per line) or bulk import from CSV. Uses Cheerio for HTML parsing and Turndown for markdown conversion.",
    href: "/scrape",
    iconComponent: Globe,
    badge: "Available",
  },
  {
    id: "video-upload",
    title: "Video Upload Tool",
    description:
      "Upload video files, add from URLs, or bulk import from CSV. Manage and organize your video collection with descriptions and categories.",
    href: "/video",
    iconComponent: Video,
    badge: "Available",
  },
  {
    id: "image-upload",
    title: "Image Upload Tool",
    description:
      "Upload image files, add from URLs, or bulk import from CSV. Manage and organize your image collection with descriptions and categories.",
    href: "/image",
    iconComponent: ImageIcon,
    badge: "Available",
  },
  {
    id: "people-explorer",
    title: "People Explorer",
    description:
      "Explore and manage people referenced in the dataset. View names, aliases, and related information.",
    href: "/people",
    iconComponent: Users,
    badge: "Available",
  },
  {
    id: "locations-explorer",
    title: "Locations Explorer",
    description:
      "Explore and manage locations referenced in the dataset. View names, aliases, geographic coordinates, and address information.",
    href: "/locations",
    iconComponent: MapPin,
    badge: "Available",
  },
  {
    id: "programs-explorer",
    title: "Programs Explorer",
    description:
      "Explore and manage programs referenced in the dataset. View names, aliases, and descriptions.",
    href: "/programs",
    iconComponent: FolderKanban,
    badge: "Available",
  },
  // Add more miniapps here as they are created
];

/**
 * Convert miniapp data to Miniapp format with rendered icons
 */
export function getMiniapps(): Miniapp[] {
  return miniappsData.map((app) => ({
    id: app.id,
    title: app.title,
    description: app.description,
    href: app.href,
    icon: React.createElement(app.iconComponent, {
      className: "w-8 h-8",
    }) as ReactElement,
    badge: app.badge,
  }));
}

export const miniapps = getMiniapps();

/**
 * Get a miniapp by its ID
 */
export function getMiniappById(id: string): Miniapp | undefined {
  return getMiniapps().find((app) => app.id === id);
}

/**
 * Get all miniapps
 */
export function getAllMiniapps(): Miniapp[] {
  return getMiniapps();
}

/**
 * Get raw miniapp data with icon components (for navigation, etc.)
 */
export function getMiniappsData(): MiniappData[] {
  return miniappsData;
}
