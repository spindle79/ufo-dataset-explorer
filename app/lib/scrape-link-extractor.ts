/**
 * Extract links, images, audio, video, and other media from HTML
 */

import * as cheerio from "cheerio";

export type LinkType =
  | "link"
  | "image"
  | "audio"
  | "video"
  | "iframe"
  | "pdf"
  | "text";

export interface ExtractedLink {
  url: string;
  type: LinkType;
  text?: string; // For links, the anchor text
  alt?: string; // For images, the alt text
}

/**
 * Resolve a relative URL to an absolute URL
 */
function resolveUrl(baseUrl: string, relativeUrl: string): string | null {
  try {
    // If it's already absolute, return as-is
    if (
      relativeUrl.startsWith("http://") ||
      relativeUrl.startsWith("https://")
    ) {
      return relativeUrl;
    }

    // If it's a data URL, return as-is
    if (relativeUrl.startsWith("data:")) {
      return null; // Skip data URLs
    }

    // Resolve relative URL
    const base = new URL(baseUrl);
    const resolved = new URL(relativeUrl, base);
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is an audio file
 */
function isAudioUrl(url: string): boolean {
  const audioExtensions = [
    ".mp3",
    ".wav",
    ".ogg",
    ".m4a",
    ".aac",
    ".flac",
    ".webm",
  ];
  const lowerUrl = url.toLowerCase();
  return (
    audioExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("/audio/") ||
    !!lowerUrl.match(/audio\/[^/]+$/i)
  );
}

/**
 * Check if a URL is a video file
 */
function isVideoUrl(url: string): boolean {
  const videoExtensions = [
    ".mp4",
    ".webm",
    ".ogg",
    ".mov",
    ".avi",
    ".mkv",
    ".flv",
    ".wmv",
  ];
  const lowerUrl = url.toLowerCase();
  return (
    videoExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("/video/") ||
    !!lowerUrl.match(/video\/[^/]+$/i)
  );
}

/**
 * Check if a URL is an image file
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
  ];
  const lowerUrl = url.toLowerCase();
  return (
    imageExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("/image/") ||
    !!lowerUrl.match(/image\/[^/]+$/i)
  );
}

/**
 * Check if a URL is a PDF file
 */
function isPdfUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes(".pdf?") ||
    lowerUrl.includes("/pdf/") ||
    !!lowerUrl.match(/pdf\/[^/]+$/i) ||
    lowerUrl.includes("application/pdf")
  );
}

/**
 * Check if a URL is a text file
 */
function isTextUrl(url: string): boolean {
  const textExtensions = [
    ".txt",
    ".text",
    ".md",
    ".markdown",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm",
    ".log",
    ".rtf",
  ];
  const lowerUrl = url.toLowerCase();
  return (
    textExtensions.some(
      (ext) => lowerUrl.endsWith(ext) || lowerUrl.includes(`${ext}?`)
    ) ||
    lowerUrl.includes("/text/") ||
    !!lowerUrl.match(/text\/[^/]+$/i)
  );
}

/**
 * Extract all links, images, audio, video, and iframes from HTML
 */
export function extractLinksFromHtml(
  html: string,
  baseUrl: string
): ExtractedLink[] {
  const $ = cheerio.load(html);
  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  // Extract regular links (a tags)
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const resolvedUrl = resolveUrl(baseUrl, href);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);
    const text = $(element).text().trim();

    // Check if it's an audio/video/image/pdf/text link
    let type: LinkType = "link";
    if (isAudioUrl(resolvedUrl)) {
      type = "audio";
    } else if (isVideoUrl(resolvedUrl)) {
      type = "video";
    } else if (isImageUrl(resolvedUrl)) {
      type = "image";
    } else if (isPdfUrl(resolvedUrl)) {
      type = "pdf";
    } else if (isTextUrl(resolvedUrl)) {
      type = "text";
    }

    links.push({
      url: resolvedUrl,
      type,
      text: text || undefined,
    });
  });

  // Extract images (img tags)
  $("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);
    const alt = $(element).attr("alt") || undefined;

    links.push({
      url: resolvedUrl,
      type: "image",
      alt,
    });
  });

  // Extract audio tags
  $("audio[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);

    links.push({
      url: resolvedUrl,
      type: "audio",
    });
  });

  // Extract source tags inside audio/video
  $("audio source[src], video source[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);
    const parentTag = $(element).parent().prop("tagName")?.toLowerCase();

    links.push({
      url: resolvedUrl,
      type: parentTag === "audio" ? "audio" : "video",
    });
  });

  // Extract video tags
  $("video[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);

    links.push({
      url: resolvedUrl,
      type: "video",
    });
  });

  // Extract iframes (often used for video embeds)
  $("iframe[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);

    // Check if it's a video embed (YouTube, Vimeo, etc.)
    const lowerUrl = resolvedUrl.toLowerCase();
    const isVideoEmbed =
      lowerUrl.includes("youtube.com") ||
      lowerUrl.includes("youtu.be") ||
      lowerUrl.includes("vimeo.com") ||
      lowerUrl.includes("dailymotion.com") ||
      lowerUrl.includes("twitch.tv");

    links.push({
      url: resolvedUrl,
      type: isVideoEmbed ? "video" : "iframe",
    });
  });

  return links;
}
