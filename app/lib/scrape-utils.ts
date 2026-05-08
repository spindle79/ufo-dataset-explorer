/**
 * Web scraping utilities using Cheerio and Turndown
 * Adapted from client-side DOM manipulation to server-side HTML parsing
 */

import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { PageContent } from "./scrape-types";

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
 * Resolve all relative URLs in HTML to absolute URLs
 */
function resolveUrlsInHtml(
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<cheerio.Element>,
  baseUrl: string
): void {
  // Attributes that may contain URLs
  const urlAttributes = [
    "href",
    "src",
    "data",
    "action",
    "formaction",
    "cite",
    "poster",
    "background",
  ];

  element.find("*").each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName?.toLowerCase();

    // Process each URL attribute
    urlAttributes.forEach((attr) => {
      const url = $el.attr(attr);
      if (url) {
        const resolved = resolveUrl(baseUrl, url);
        if (resolved) {
          $el.attr(attr, resolved);
        }
      }
    });

    // Also check style attribute for url() references
    const style = $el.attr("style");
    if (style) {
      // Match url(...) patterns in CSS
      const updatedStyle = style.replace(
        /url\((['"]?)([^'")]+)\1\)/gi,
        (match, quote, url) => {
          const resolved = resolveUrl(baseUrl, url.trim());
          return resolved ? `url(${quote}${resolved}${quote})` : match;
        }
      );
      if (updatedStyle !== style) {
        $el.attr("style", updatedStyle);
      }
    }
  });

  // Also process the root element itself
  urlAttributes.forEach((attr) => {
    const url = element.attr(attr);
    if (url) {
      const resolved = resolveUrl(baseUrl, url);
      if (resolved) {
        element.attr(attr, resolved);
      }
    }
  });
}

/**
 * Remove class and data attributes from an element (Cheerio version)
 */
const removeClassesAndDataAttributes = (
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<cheerio.Element>
): void => {
  element.find("*").each((_, el) => {
    const $el = $(el);
    $el.removeAttr("class");
    // Remove all data-* attributes
    Object.keys(el.attribs || {}).forEach((attr) => {
      if (attr.startsWith("data-")) {
        $el.removeAttr(attr);
      }
    });
  });
};

/**
 * Extract main content from HTML
 */
const extractMainContent = (
  $: cheerio.CheerioAPI
): cheerio.Cheerio<cheerio.Element> => {
  // Remove unwanted elements
  const unwantedSelectors = [
    "script",
    "style",
    "header",
    "footer",
    "nav",
    "aside",
    "iframe",
    "noscript",
  ];
  unwantedSelectors.forEach((selector) => {
    $(selector).remove();
  });

  // Remove all class attributes
  $("[class]").removeAttr("class");

  // Remove all data-* attributes
  $("*").each((_, el) => {
    const $el = $(el);
    Object.keys(el.attribs || {}).forEach((attr) => {
      if (attr.startsWith("data-")) {
        $el.removeAttr(attr);
      }
    });
  });

  // Find the element with the most text content
  let mainContent = $("body");
  let maxTextLength = 0;

  $("body *").each((_, element) => {
    const textLength = $(element).text().trim().length;
    if (textLength > maxTextLength) {
      maxTextLength = textLength;
      mainContent = $(element);
    }
  });

  return mainContent;
};

/**
 * Clean HTML by removing unwanted elements and attributes
 */
const cleanHtml = (
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<cheerio.Element>
): cheerio.Cheerio<cheerio.Element> => {
  // Clone to avoid modifying original
  const $cloned = element.clone();

  // Remove unwanted elements
  const unwantedSelectors = [
    "script",
    "style",
    "link",
    "meta",
    "header",
    "footer",
    "nav",
    "aside",
    "iframe",
    "noscript",
    "button",
    ".ad",
    ".ads",
    ".advertisement",
    ".social-share",
    ".comments",
    '[role="complementary"]',
    '[role="banner"]',
    '[role="contentinfo"]',
  ];

  unwantedSelectors.forEach((selector) => {
    $cloned.find(selector).remove();
  });

  // Remove empty elements (but preserve media elements and links to media)
  $cloned.find("*").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const tagName = el.tagName?.toLowerCase();

    // Always preserve these elements
    if (
      [
        "img",
        "br",
        "hr",
        "audio",
        "video",
        "source",
        "object",
        "embed",
      ].includes(tagName || "")
    ) {
      return;
    }

    // Preserve links (a tags) - they might link to media files
    if (tagName === "a" && $el.attr("href")) {
      return;
    }

    // Preserve elements that contain media elements
    if ($el.find("img, audio, video, source, object, embed").length > 0) {
      return;
    }

    // Remove empty elements
    if (text === "") {
      $el.remove();
    }
  });

  return $cloned;
};

/**
 * Initialize Turndown service with custom rules
 */
function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
  });

  // Add table support
  turndownService.addRule("table", {
    filter: ["table"],
    replacement: function (content, node) {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.rows || []);

      if (rows.length === 0) return "";

      // Check if first row has header cells (<th>)
      const firstRow = rows[0];
      const hasHeaderRow =
        firstRow &&
        Array.from(firstRow.cells).some(
          (cell) => cell.tagName?.toLowerCase() === "th"
        );

      let headerRow: string | null = null;
      let separator: string | null = null;
      let dataRows: string[];
      let startRowIndex = 0;

      if (hasHeaderRow) {
        // Get headers from <th> cells
        const headers = Array.from(firstRow.cells).map(
          (cell) => cell.textContent?.trim() || ""
        );

        if (headers.length === 0) return "";

        // Create header row
        headerRow = `| ${headers.join(" | ")} |`;

        // Create separator row
        separator = `| ${headers.map(() => "---").join(" | ")} |`;

        // Data rows start from index 1
        startRowIndex = 1;
      }

      // Create data rows (all rows if no header, or rows after header)
      dataRows = rows.slice(startRowIndex).map((row) => {
        const cells = Array.from(row.cells).map(
          (cell) => cell.textContent?.trim() || ""
        );
        return `| ${cells.join(" | ")} |`;
      });

      if (dataRows.length === 0) return "";

      // Combine all parts
      if (headerRow && separator) {
        return `\n\n${headerRow}\n${separator}\n${dataRows.join("\n")}\n\n`;
      } else {
        // No header row - just output data rows
        return `\n\n${dataRows.join("\n")}\n\n`;
      }
    },
  });

  // Add cell support
  turndownService.addRule("tableCell", {
    filter: ["th", "td"],
    replacement: function (content) {
      return content.trim();
    },
  });

  return turndownService;
}

/**
 * Process HTML snippet and convert to markdown
 */
export function processHtmlSnippet(
  html: string,
  title?: string,
  sourceUrl?: string
): PageContent {
  const DEFAULT_PAGE_TEXT = "HTML content unavailable";
  const DEFAULT_TITLE = "HTML Snippet";

  try {
    // Load HTML into Cheerio
    // If the HTML doesn't have a body tag, wrap it
    let processedHtml = html.trim();
    if (!processedHtml.includes("<body") && !processedHtml.includes("<html")) {
      processedHtml = `<body>${processedHtml}</body>`;
    }
    if (!processedHtml.includes("<html")) {
      processedHtml = `<html><head></head>${processedHtml}</html>`;
    }

    const $ = cheerio.load(processedHtml);

    // Extract title from HTML or use provided title
    const extractedTitle = $("title").text().trim() || title || DEFAULT_TITLE;

    // Extract main content
    const mainElement = extractMainContent($);

    // Clean the HTML
    const cleanedHtmlEl = cleanHtml($, mainElement);
    removeClassesAndDataAttributes($, cleanedHtmlEl);

    // Use a data URL or placeholder URL for HTML snippets
    const url =
      sourceUrl ||
      `data:text/html;base64,${Buffer.from(html)
        .toString("base64")
        .substring(0, 100)}`;

    // Resolve all relative URLs to absolute URLs (if we have a source URL)
    if (sourceUrl) {
      resolveUrlsInHtml($, cleanedHtmlEl, sourceUrl);
    }

    // Initialize Turndown service
    const turndownService = createTurndownService();

    // Convert to markdown
    const htmlString = $.html(cleanedHtmlEl);
    const pageMarkdown = turndownService.turndown(htmlString);
    const pageText = cleanedHtmlEl.text().trim();

    // Check for large content
    const markdownSize = new Blob([pageMarkdown]).size;
    if (markdownSize > 100000) {
      console.warn("[Scrape] Large HTML content detected:", {
        size: `${(markdownSize / 1024).toFixed(2)} KB`,
        title: extractedTitle,
        recommendation: "This HTML content is unusually large",
      });
    }

    return {
      markdown: pageMarkdown || DEFAULT_PAGE_TEXT,
      text: pageText || DEFAULT_PAGE_TEXT,
      rawHtml: htmlString,
      url,
      title: extractedTitle,
    };
  } catch (error) {
    console.error("[Scrape] Error processing HTML snippet:", error);
    const errorMessage = `Error processing HTML: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    return {
      markdown: errorMessage,
      text: errorMessage,
      rawHtml: "", // No HTML available on error
      url: sourceUrl || "data:text/html",
      title: title || DEFAULT_TITLE,
    };
  }
}

/**
 * Scrape a web page and convert to markdown
 */
export async function scrapePage(url: string): Promise<PageContent> {
  const DEFAULT_PAGE_TEXT = "Page content unavailable";

  try {
    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $("title").text().trim() || url;

    // Extract main content
    const mainElement = extractMainContent($);

    // Clean the HTML
    const cleanedHtmlEl = cleanHtml($, mainElement);
    removeClassesAndDataAttributes($, cleanedHtmlEl);

    // Resolve all relative URLs to absolute URLs
    resolveUrlsInHtml($, cleanedHtmlEl, url);

    // Initialize Turndown service
    const turndownService = createTurndownService();

    // Convert to markdown
    const htmlString = $.html(cleanedHtmlEl);
    const pageMarkdown = turndownService.turndown(htmlString);
    const pageText = cleanedHtmlEl.text().trim();

    // Check for large content
    const markdownSize = new Blob([pageMarkdown]).size;
    if (markdownSize > 100000) {
      console.warn("[Scrape] Large page content detected:", {
        size: `${(markdownSize / 1024).toFixed(2)} KB`,
        url,
        recommendation: "This page content is unusually large",
      });
    }

    return {
      markdown: pageMarkdown || DEFAULT_PAGE_TEXT,
      text: pageText || DEFAULT_PAGE_TEXT,
      rawHtml: htmlString, // Return the cleaned HTML before markdown conversion
      url,
      title,
    };
  } catch (error) {
    console.error("[Scrape] Error scraping page:", error);
    const errorMessage = `Error scraping page: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    return {
      markdown: errorMessage,
      text: errorMessage,
      rawHtml: "", // No HTML available on error
      url,
      title: url,
    };
  }
}
