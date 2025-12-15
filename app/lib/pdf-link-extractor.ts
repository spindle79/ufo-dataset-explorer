/**
 * Extract links, images, and other media from PDF files
 */

import type { ExtractedLink, LinkType } from "./scrape-link-extractor";

// Polyfill DOMMatrix for Node.js environment (required by pdfjs-dist v5+)
// DOMMatrix is a browser API that doesn't exist in Node.js
// This must be set up before importing pdfjs-dist
if (
  typeof window === "undefined" &&
  typeof globalThis.DOMMatrix === "undefined"
) {
  // Create a minimal DOMMatrix implementation for Node.js
  // pdfjs-dist uses this for canvas operations, but we only need basic structure
  class DOMMatrixPolyfill {
    constructor(init?: string | number[]) {
      // Initialize as identity matrix
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;

      // If init is provided, parse it (simplified - pdfjs-dist may not use this)
      if (init && typeof init === "string") {
        // Parse matrix string if needed
        const values = init.match(/[\d.]+/g);
        if (values && values.length >= 6) {
          this.a = parseFloat(values[0]);
          this.b = parseFloat(values[1]);
          this.c = parseFloat(values[2]);
          this.d = parseFloat(values[3]);
          this.e = parseFloat(values[4]);
          this.f = parseFloat(values[5]);
        }
      }
    }
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill as any;
}

// Use dynamic import to ensure polyfill is set up first
// Use legacy build for Node.js as recommended by pdfjs-dist
let pdfjsLib: typeof import("pdfjs-dist/legacy/build/pdf.mjs");

// Re-export ExtractedLink for use in other modules
export type { ExtractedLink, LinkType } from "./scrape-link-extractor";

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
 * Determine link type from URL
 */
function getLinkType(url: string): LinkType {
  if (isAudioUrl(url)) {
    return "audio";
  } else if (isVideoUrl(url)) {
    return "video";
  } else if (isImageUrl(url)) {
    return "image";
  } else if (isPdfUrl(url)) {
    return "pdf";
  } else if (isTextUrl(url)) {
    return "text";
  }
  return "link";
}

/**
 * Extract all links and images from a PDF file
 */
export async function extractLinksFromPdf(
  pdfBuffer: Buffer,
  baseUrl?: string
): Promise<ExtractedLink[]> {
  // Dynamically import pdfjs-dist after polyfill is set up
  if (!pdfjsLib) {
    // Use legacy build for Node.js environments (recommended by pdfjs-dist)
    if (typeof window === "undefined") {
      // Legacy build uses .mjs extension
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      // Legacy build doesn't require worker configuration
    } else {
      // Use regular build for browser
      pdfjsLib = await import("pdfjs-dist");
    }
  }

  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  try {
    // Convert Buffer to Uint8Array (required by pdfjs-dist v5+)
    const uint8Array = new Uint8Array(pdfBuffer);

    // Load the PDF document
    // For Node.js, explicitly disable worker and eval
    const documentOptions: any = {
      data: uint8Array,
      useSystemFonts: true,
      isEvalSupported: false, // Disable eval for security
      verbosity: 0, // Reduce logging
    };

    // In Node.js, force disable worker by setting it before getDocument
    if (typeof window === "undefined") {
      // Ensure worker is disabled
      documentOptions.disableWorker = true;
      // Also try to set useWorkerFetch to false if available
      documentOptions.useWorkerFetch = false;
    }

    const loadingTask = pdfjsLib.getDocument(documentOptions);

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    // Iterate through all pages
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);

      // Extract link annotations (external URLs and internal links)
      const annotations = await page.getAnnotations();
      for (const annotation of annotations) {
        if (annotation.subtype === "Link") {
          const linkUrl = annotation.url || annotation.uri;
          if (linkUrl) {
            let resolvedUrl: string | null = null;

            // Handle external URLs
            if (
              linkUrl.startsWith("http://") ||
              linkUrl.startsWith("https://")
            ) {
              resolvedUrl = linkUrl;
            } else if (baseUrl) {
              // Resolve relative URLs using base URL
              resolvedUrl = resolveUrl(baseUrl, linkUrl);
            } else {
              // If no base URL, skip relative URLs
              continue;
            }

            if (resolvedUrl && !seenUrls.has(resolvedUrl)) {
              seenUrls.add(resolvedUrl);
              const linkType = getLinkType(resolvedUrl);
              links.push({
                url: resolvedUrl,
                type: linkType,
                text: annotation.contents || undefined,
              });
            }
          }
        }
      }

      // Extract images from the page using operator list
      try {
        const operatorList = await page.getOperatorList();
        const imageNames = new Set<string>();

        // Find image XObject operations
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const op = operatorList.fnArray[i];
          const args = operatorList.argsArray[i];

          // Check for paintImageXObject operator
          // OPS.paintImageXObject = 85 in pdfjs-dist
          // Try to access OPS from pdfjsLib, fallback to numeric value
          const OPS = (pdfjsLib as any).OPS;
          const paintImageXObjectOp = OPS?.paintImageXObject ?? 85;
          if (op === paintImageXObjectOp) {
            const imageName = args[0];
            if (imageName && typeof imageName === "string") {
              imageNames.add(imageName);
            }
          }
        }

        // Extract image references
        for (const imageName of imageNames) {
          try {
            // Create a reference URL for the embedded image
            const imageUrl = `pdf-image://${pdfDocument.fingerprints[0]}/${pageNum}/${imageName}`;
            if (!seenUrls.has(imageUrl)) {
              seenUrls.add(imageUrl);
              links.push({
                url: imageUrl,
                type: "image",
                alt: `Image from page ${pageNum}`,
              });
            }
          } catch (imgError) {
            // Skip individual image errors
            console.warn(`Error processing image ${imageName}:`, imgError);
          }
        }
      } catch (imageError) {
        // Image extraction is optional - don't fail if it doesn't work
        console.warn(
          `Error extracting images from page ${pageNum}:`,
          imageError
        );
      }
    }
  } catch (error) {
    console.error("Error extracting links from PDF:", error);
    throw error;
  }

  return links;
}
