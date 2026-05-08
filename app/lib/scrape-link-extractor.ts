/**
 * Extract links, images, audio, video, and other media from HTML
 */

import * as cheerio from "cheerio";
// @ts-ignore - mime-types types may not be properly resolved
import * as mime from "mime-types";

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

    // Handle protocol-relative URLs (starting with //)
    if (relativeUrl.startsWith("//")) {
      const base = new URL(baseUrl);
      return `${base.protocol}${relativeUrl}`;
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
  // Remove query parameters and hash for extension checking
  const urlWithoutQuery = url.split("?")[0].split("#")[0];

  // Get MIME type from the URL
  const mimeType = mime.lookup(urlWithoutQuery);

  // Check if it's an audio MIME type
  return mimeType !== false && mimeType.startsWith("audio/");
}

/**
 * Check if a URL is a video file
 */
function isVideoUrl(url: string): boolean {
  // Remove query parameters and hash for extension checking
  const urlWithoutQuery = url.split("?")[0].split("#")[0];

  // Get MIME type from the URL
  const mimeType = mime.lookup(urlWithoutQuery);

  // Check if it's a video MIME type
  return mimeType !== false && mimeType.startsWith("video/");
}

/**
 * Check if a URL is an image file
 */
function isImageUrl(url: string): boolean {
  // Remove query parameters and hash for extension checking
  const urlWithoutQuery = url.split("?")[0].split("#")[0];

  // Get MIME type from the URL
  const mimeType = mime.lookup(urlWithoutQuery);

  // Check if it's an image MIME type
  return mimeType !== false && mimeType.startsWith("image/");
}

/**
 * Check if a URL is a PDF file
 */
function isPdfUrl(url: string): boolean {
  // Remove query parameters and hash for extension checking
  const urlWithoutQuery = url.split("?")[0].split("#")[0];

  // Get MIME type from the URL
  const mimeType = mime.lookup(urlWithoutQuery);

  // Check if it's a PDF MIME type
  return mimeType === "application/pdf";
}

/**
 * Check if a URL is a text file
 */
function isTextUrl(url: string): boolean {
  // Remove query parameters and hash for extension checking
  const urlWithoutQuery = url.split("?")[0].split("#")[0];

  // Get MIME type from the URL
  const mimeType = mime.lookup(urlWithoutQuery);

  // Check if it's a text MIME type (text/* or specific text-based application types)
  if (mimeType === false) return false;

  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType === "application/typescript" ||
    mimeType === "application/x-sh" ||
    mimeType === "application/x-csv" ||
    mimeType === "text/csv"
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
    // Check both resolved URL and original href (in case resolution changes detection)
    let type: LinkType = "link";
    if (isAudioUrl(resolvedUrl) || isAudioUrl(href)) {
      type = "audio";
    } else if (isVideoUrl(resolvedUrl) || isVideoUrl(href)) {
      type = "video";
    } else if (isImageUrl(resolvedUrl) || isImageUrl(href)) {
      type = "image";
    } else if (isPdfUrl(resolvedUrl) || isPdfUrl(href)) {
      type = "pdf";
    } else if (isTextUrl(resolvedUrl) || isTextUrl(href)) {
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

    // Verify it's actually an image (check both resolved and original)
    const isImage = isImageUrl(resolvedUrl) || isImageUrl(src);

    links.push({
      url: resolvedUrl,
      type: isImage ? "image" : "link",
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

    // Verify it's actually audio (check both resolved and original)
    const isAudio = isAudioUrl(resolvedUrl) || isAudioUrl(src);

    links.push({
      url: resolvedUrl,
      type: isAudio ? "audio" : "link",
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

    // Determine type based on parent tag and URL pattern (check both resolved and original)
    let type: LinkType = "link";
    if (parentTag === "audio") {
      type = isAudioUrl(resolvedUrl) || isAudioUrl(src) ? "audio" : "link";
    } else if (parentTag === "video") {
      type = isVideoUrl(resolvedUrl) || isVideoUrl(src) ? "video" : "link";
    } else {
      // Fallback: check URL patterns
      if (isAudioUrl(resolvedUrl) || isAudioUrl(src)) {
        type = "audio";
      } else if (isVideoUrl(resolvedUrl) || isVideoUrl(src)) {
        type = "video";
      }
    }

    links.push({
      url: resolvedUrl,
      type,
    });
  });

  // Extract video tags
  $("video[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);

    // Verify it's actually a video (check both resolved and original)
    const isVideo = isVideoUrl(resolvedUrl) || isVideoUrl(src);

    links.push({
      url: resolvedUrl,
      type: isVideo ? "video" : "link",
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

  // Extract object tags (can contain audio/video via data attribute)
  $("object[data]").each((_, element) => {
    const data = $(element).attr("data");
    if (!data) return;

    const resolvedUrl = resolveUrl(baseUrl, data);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);

    // Determine type based on URL (check both resolved and original)
    let type: LinkType = "link";
    if (isAudioUrl(resolvedUrl) || isAudioUrl(data)) {
      type = "audio";
    } else if (isVideoUrl(resolvedUrl) || isVideoUrl(data)) {
      type = "video";
    } else if (isImageUrl(resolvedUrl) || isImageUrl(data)) {
      type = "image";
    } else if (isPdfUrl(resolvedUrl) || isPdfUrl(data)) {
      type = "pdf";
    } else if (isTextUrl(resolvedUrl) || isTextUrl(data)) {
      type = "text";
    }

    links.push({
      url: resolvedUrl,
      type,
    });
  });

  // Extract embed tags (can contain audio/video via src attribute)
  $("embed[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;

    const resolvedUrl = resolveUrl(baseUrl, src);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);

    // Determine type based on URL (check both resolved and original)
    let type: LinkType = "link";
    if (isAudioUrl(resolvedUrl) || isAudioUrl(src)) {
      type = "audio";
    } else if (isVideoUrl(resolvedUrl) || isVideoUrl(src)) {
      type = "video";
    } else if (isImageUrl(resolvedUrl) || isImageUrl(src)) {
      type = "image";
    } else if (isPdfUrl(resolvedUrl) || isPdfUrl(src)) {
      type = "pdf";
    } else if (isTextUrl(resolvedUrl) || isTextUrl(src)) {
      type = "text";
    }

    links.push({
      url: resolvedUrl,
      type,
    });
  });

  return links;
}
