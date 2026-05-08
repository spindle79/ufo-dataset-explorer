/**
 * Scraped Page Data Access Layer
 *
 * Manages storage and retrieval of scraped web pages and their metadata.
 * Uses Supabase database for metadata and Supabase Storage for content files.
 */

import { createAdminClient } from "./supabase/server";
import type {
  ScrapedPage,
  ScrapedPageCreate,
  ScrapedPageUpdate,
} from "./supabase-types";
import {
  STORAGE_BUCKETS,
  uploadFile,
  downloadFile,
  deleteFile,
} from "./supabase-storage";
import { getCanonicalUrl } from "./url-utils";

const SCRAPED_PAGES_BUCKET = STORAGE_BUCKETS.SCRAPED_PAGES;

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Generate a storage path for scraped page content
 */
function getStoragePath(id: string, type: "markdown" | "html"): string {
  return `scraped-pages/${id}/${
    type === "markdown" ? "content.md" : "content.html"
  }`;
}

/**
 * Create a new scraped page record
 */
export async function createScrapedPage(
  data: ScrapedPageCreate,
  markdown: string,
  text: string,
  rawHtml?: string,
  error?: string
): Promise<ScrapedPage> {
  const supabase = createAdminClient();

  // Extract domain from URL
  const domain = data.domain || extractDomain(data.url);

  // Prepare insert data
  const insertData = {
    url: data.url,
    canonical_url: data.canonical_url || getCanonicalUrl(data.url),
    domain: domain,
    title: data.title,
    description: data.description || "",
    categories: data.categories || [],
    markdown_path: null, // Will be set after upload
    html_path: null, // Will be set after upload
    file_size: null, // Will be set after upload
    error: error || null,
  };

  // Log data sizes and basic validation
  const markdownSize = new Blob([markdown]).size;
  const textSize = new Blob([text]).size;
  const htmlSize = rawHtml ? new Blob([rawHtml]).size : 0;

  console.log("Inserting scraped page:", {
    url: insertData.url,
    domain: insertData.domain,
    title: insertData.title,
    description: insertData.description?.substring(0, 100),
    categories: insertData.categories,
    markdownSize: `${(markdownSize / 1024).toFixed(2)} KB`,
    textSize: `${(textSize / 1024).toFixed(2)} KB`,
    htmlSize: `${(htmlSize / 1024).toFixed(2)} KB`,
    hasMarkdown: !!markdown,
    hasText: !!text,
    hasHtml: !!rawHtml,
    markdownPreview: markdown.substring(0, 200),
  });

  // Generate UUID for the record
  // Try without .single() first to see if that's causing issues
  console.log("Attempting database insert...");

  // Check if URL already exists (for debugging)
  const existingCheck = await supabase
    .from("scraped_pages")
    .select("id, url, title")
    .eq("url", data.url)
    .limit(1);

  console.log("Existing URL check:", {
    found: !!existingCheck.data && existingCheck.data.length > 0,
    count: existingCheck.data?.length || 0,
    error: existingCheck.error,
  });

  let insertResponse: any;
  let insertError: any = null;
  let pageDataArray: any = null;

  try {
    insertResponse = await supabase
      .from("scraped_pages")
      .insert(insertData)
      .select();

    // Check for HTTP status codes in the response
    const status = (insertResponse as any).status;
    const statusText = (insertResponse as any).statusText;

    console.log("Insert response received:", {
      hasData: !!insertResponse.data,
      dataLength: insertResponse.data?.length,
      hasError: !!insertResponse.error,
      errorType: typeof insertResponse.error,
      errorKeys: insertResponse.error ? Object.keys(insertResponse.error) : [],
      status: status,
      statusText: statusText,
      fullResponse: JSON.stringify(insertResponse, null, 2),
    });

    // If we get a 404, the table doesn't exist or isn't accessible
    if (status === 404) {
      insertError = {
        message: `Table 'scraped_pages' not found (404). Please ensure the table exists and migrations have been run.`,
        code: "404",
        status: 404,
        statusText: statusText,
        hint: "Check if the scraped_pages table exists in your Supabase database and that migrations have been applied.",
      };
    } else if (status && status >= 400) {
      // Other HTTP errors
      insertError = {
        message: `Database error: ${statusText || "Unknown error"} (${status})`,
        code: String(status),
        status: status,
        statusText: statusText,
      };
    } else {
      pageDataArray = insertResponse.data;
      insertError = insertResponse.error;
    }
  } catch (exception) {
    console.error("Exception during insert:", {
      exception,
      type: typeof exception,
      message:
        exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });
    insertError = exception;
  }

  if (insertError) {
    // Check for nested error structure (Supabase sometimes nests errors)
    const errorObj = insertError as any;

    // Try to get error information using multiple methods
    const errorDescriptors = Object.getOwnPropertyDescriptors(errorObj);
    const errorPrototype = Object.getPrototypeOf(errorObj);

    // Log the raw error object structure for debugging
    console.error("Raw insertError:", {
      type: typeof insertError,
      constructor: insertError?.constructor?.name,
      keys: Object.keys(errorObj),
      ownPropertyNames: Object.getOwnPropertyNames(errorObj),
      descriptors: errorDescriptors,
      prototype: errorPrototype,
      stringified: JSON.stringify(insertError),
      toString: String(insertError),
      errorObj: errorObj,
      // Try accessing common Supabase error properties directly
      directMessage: (insertError as any)?.message,
      directCode: (insertError as any)?.code,
      directDetails: (insertError as any)?.details,
      directHint: (insertError as any)?.hint,
    });

    // Also log the full response object
    if (insertResponse) {
      console.error("Full insertResponse:", {
        data: insertResponse.data,
        error: insertResponse.error,
        hasData: !!insertResponse.data,
        hasError: !!insertResponse.error,
      });
    }

    const errorInfo: Record<string, any> = {
      message: errorObj.message,
      code: errorObj.code || errorObj.status,
      details: errorObj.details,
      hint: errorObj.hint,
      status: errorObj.status,
      statusText: errorObj.statusText,
    };

    // Check for nested error
    if (errorObj.error) {
      errorInfo.nestedMessage = errorObj.error?.message;
      errorInfo.nestedDetails = errorObj.error?.details;
      errorInfo.nestedHint = errorObj.error?.hint;
      errorInfo.nestedCode = errorObj.error?.code;
    }

    // Check for error.body (PostgREST format)
    if (errorObj.body) {
      errorInfo.bodyMessage = errorObj.body?.message;
      errorInfo.bodyDetails = errorObj.body?.details;
      errorInfo.bodyHint = errorObj.body?.hint;
      errorInfo.bodyCode = errorObj.body?.code;
    }

    // Check for PostgREST error format (sometimes errors are in a different structure)
    if (errorObj.response) {
      errorInfo.responseStatus = errorObj.response?.status;
      errorInfo.responseStatusText = errorObj.response?.statusText;
      errorInfo.responseData = errorObj.response?.data;
    }

    // Try to get error from toString if it's an Error instance
    if (insertError instanceof Error) {
      errorInfo.errorInstanceMessage = insertError.message;
      errorInfo.errorInstanceStack = insertError.stack;
    }

    console.error("Database insert error details:", errorInfo);

    // Try to get a meaningful error message
    const errorMessage =
      errorInfo.message || // Use the message we created for 404 errors
      errorInfo.nestedMessage ||
      errorInfo.nestedDetails ||
      errorInfo.nestedHint ||
      errorInfo.bodyMessage ||
      errorInfo.bodyDetails ||
      errorInfo.bodyHint ||
      errorInfo.details ||
      errorInfo.hint ||
      errorInfo.errorInstanceMessage ||
      (errorInfo.status
        ? `HTTP ${errorInfo.status}: ${errorInfo.statusText || "Unknown error"}`
        : null) ||
      errorInfo.code ||
      String(insertError) ||
      JSON.stringify(insertError) ||
      "Unknown database error";

    throw new Error(`Failed to create scraped page: ${errorMessage}`);
  }

  // Handle the response (could be array or single item)
  if (!pageDataArray || pageDataArray.length === 0) {
    console.error("No pageData returned from insert, but no error either");
    throw new Error(
      "Failed to create scraped page: No data returned from insert"
    );
  }

  // Get the first (and should be only) item
  const pageData = pageDataArray[0];
  const id = pageData.id;

  try {
    // Upload markdown to storage
    const markdownPath = getStoragePath(id, "markdown");
    const markdownBuffer = Buffer.from(markdown, "utf-8");
    console.log(
      `Uploading markdown to bucket: ${SCRAPED_PAGES_BUCKET}, path: ${markdownPath}`
    );
    await uploadFile(SCRAPED_PAGES_BUCKET, markdownPath, markdownBuffer, {
      contentType: "text/markdown",
      useAdmin: true,
    });
    console.log("Markdown uploaded successfully");

    // Upload HTML to storage if available
    let htmlPath: string | null = null;
    if (rawHtml && rawHtml.length > 0) {
      htmlPath = getStoragePath(id, "html");
      const htmlBuffer = Buffer.from(rawHtml, "utf-8");
      console.log(
        `Uploading HTML to bucket: ${SCRAPED_PAGES_BUCKET}, path: ${htmlPath}`
      );
      await uploadFile(SCRAPED_PAGES_BUCKET, htmlPath, htmlBuffer, {
        contentType: "text/html",
        useAdmin: true,
      });
      console.log("HTML uploaded successfully");
    } else {
      console.log("No HTML to upload");
    }

    // Update record with storage paths and file size
    const fileSize = markdownBuffer.length;
    const { data: updatedData, error: updateError } = await supabase
      .from("scraped_pages")
      .update({
        markdown_path: markdownPath,
        html_path: htmlPath,
        file_size: fileSize,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedData) {
      throw new Error(
        `Failed to update scraped page: ${
          updateError?.message || "Unknown error"
        }`
      );
    }

    return updatedData;
  } catch (storageError) {
    console.error("Storage upload failed, deleting database record:", id);
    console.error("Storage error details:", {
      message:
        storageError instanceof Error
          ? storageError.message
          : "Not an Error instance",
      type: typeof storageError,
      stringified: JSON.stringify(storageError),
      error: storageError,
    });

    // If storage upload fails, delete the database record
    try {
      await supabase.from("scraped_pages").delete().eq("id", id);
    } catch (deleteError) {
      console.error(
        "Failed to delete database record after storage error:",
        deleteError
      );
    }

    const errorMessage =
      storageError instanceof Error
        ? storageError.message
        : typeof storageError === "string"
        ? storageError
        : JSON.stringify(storageError);

    throw new Error(`Failed to upload content: ${errorMessage}`);
  }
}

/**
 * Get scraped page by ID
 */
export async function getScrapedPageById(
  id: string
): Promise<ScrapedPage | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scraped_pages")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch scraped page: ${error.message}`);
  }

  return data;
}

/**
 * Get all scraped pages
 */
export async function getAllScrapedPages(): Promise<ScrapedPage[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scraped_pages")
    .select("*")
    .order("scraped_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch scraped pages: ${error.message}`);
  }

  return data || [];
}

/**
 * Update scraped page metadata
 */
export async function updateScrapedPage(
  id: string,
  updates: ScrapedPageUpdate
): Promise<ScrapedPage | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scraped_pages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to update scraped page: ${error.message}`);
  }

  return data;
}

/**
 * Delete scraped page
 */
export async function deleteScrapedPage(id: string): Promise<boolean> {
  const supabase = createAdminClient();

  // Get the page to find storage paths
  const page = await getScrapedPageById(id);
  if (!page) {
    return false;
  }

  // Delete files from storage
  try {
    if (page.markdown_path) {
      await deleteFile(SCRAPED_PAGES_BUCKET, page.markdown_path, true);
    }
    if (page.html_path) {
      await deleteFile(SCRAPED_PAGES_BUCKET, page.html_path, true);
    }
  } catch (error) {
    // Log but don't fail if storage deletion fails
    console.warn(`Failed to delete storage files for ${id}:`, error);
  }

  // Delete database record
  const { error } = await supabase.from("scraped_pages").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete scraped page: ${error.message}`);
  }

  return true;
}

/**
 * Get scraped page markdown content
 */
export async function getScrapedPageContent(
  id: string
): Promise<string | null> {
  const page = await getScrapedPageById(id);
  if (!page || !page.markdown_path) {
    return null;
  }

  try {
    const blob = await downloadFile(
      SCRAPED_PAGES_BUCKET,
      page.markdown_path,
      true
    );
    const text = await blob.text();
    return text;
  } catch (error) {
    console.error("Failed to read scraped page content:", error);
    return null;
  }
}

/**
 * Get scraped page raw HTML content
 */
export async function getScrapedPageHtml(id: string): Promise<string | null> {
  const page = await getScrapedPageById(id);
  if (!page || !page.html_path) {
    return null;
  }

  try {
    const blob = await downloadFile(SCRAPED_PAGES_BUCKET, page.html_path, true);
    const text = await blob.text();
    return text;
  } catch (error) {
    console.error("Failed to read scraped page HTML:", error);
    return null;
  }
}

/**
 * Get all unique domains with aggregated counts
 */
export interface DomainWithCounts {
  domain: string;
  pageCount: number;
  documentCount: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
}

export async function getDomainsWithCounts(): Promise<DomainWithCounts[]> {
  const supabase = createAdminClient();

  // Get all unique domains with page counts
  const { data: domainData, error: domainError } = await supabase
    .from("scraped_pages")
    .select("domain")
    .not("domain", "is", null);

  if (domainError) {
    throw new Error(`Failed to fetch domains: ${domainError.message}`);
  }

  // Get unique domains
  const uniqueDomains = Array.from(
    new Set(domainData?.map((d) => d.domain).filter(Boolean) || [])
  );

  // For each domain, get counts
  const domainsWithCounts = await Promise.all(
    uniqueDomains.map(async (domain) => {
      // Get page count
      const { count: pageCount } = await supabase
        .from("scraped_pages")
        .select("*", { count: "exact", head: true })
        .eq("domain", domain);

      // Get media counts via relationships
      // First, get all page IDs for this domain
      const { data: pages } = await supabase
        .from("scraped_pages")
        .select("id")
        .eq("domain", domain);

      const pageIds = pages?.map((p) => p.id) || [];

      if (pageIds.length === 0) {
        return {
          domain,
          pageCount: pageCount || 0,
          documentCount: 0,
          imageCount: 0,
          audioCount: 0,
          videoCount: 0,
        };
      }

      // Get media relationships for these pages
      const { data: relationships } = await supabase
        .from("scraped_page_media")
        .select(
          `
          original_uploads:original_upload_id (
            dataset_type
          )
        `
        )
        .in("scraped_page_id", pageIds);

      // Count by type
      let documentCount = 0;
      let imageCount = 0;
      let audioCount = 0;
      let videoCount = 0;

      relationships?.forEach((rel: any) => {
        const type = rel.original_uploads?.dataset_type;
        if (type === "pdf") documentCount++;
        else if (type === "image") imageCount++;
        else if (type === "audio") audioCount++;
        else if (type === "video") videoCount++;
      });

      return {
        domain,
        pageCount: pageCount || 0,
        documentCount,
        imageCount,
        audioCount,
        videoCount,
      };
    })
  );

  return domainsWithCounts;
}

/**
 * Get pages filtered by domain
 */
export async function getPagesByDomain(
  domain: string
): Promise<ScrapedPage[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scraped_pages")
    .select("*")
    .eq("domain", domain)
    .order("scraped_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pages by domain: ${error.message}`);
  }

  return data || [];
}

/**
 * Get media files for a domain by type
 */
export interface DomainMediaItem {
  id: string;
  type: "pdf" | "image" | "audio" | "video";
  url: string;
  status: string;
  title?: string;
  fileName?: string;
  discoveredAt: string;
  sourcePageId: string;
  sourcePageTitle: string;
  sourcePageUrl: string;
}

export async function getMediaByDomain(
  domain: string,
  type: "pdf" | "image" | "audio" | "video"
): Promise<DomainMediaItem[]> {
  const supabase = createAdminClient();

  // First, get all page IDs for this domain
  const { data: pages } = await supabase
    .from("scraped_pages")
    .select("id, title, url")
    .eq("domain", domain);

  if (!pages || pages.length === 0) {
    return [];
  }

  const pageIds = pages.map((p) => p.id);
  const pageMap = new Map(pages.map((p) => [p.id, p]));

  // Get media relationships for these pages
  const { data: relationships, error } = await supabase
    .from("scraped_page_media")
    .select(
      `
      scraped_page_id,
      discovered_at,
      original_uploads:original_upload_id (
        id,
        dataset_type,
        original_url,
        canonical_url,
        status,
        file_name
      )
    `
    )
    .in("scraped_page_id", pageIds);

  if (error) {
    throw new Error(`Failed to fetch media by domain: ${error.message}`);
  }

  // Filter by type and map to result format
  const mediaItems: DomainMediaItem[] = [];

  relationships?.forEach((rel: any) => {
    const upload = rel.original_uploads;
    if (upload?.dataset_type === type) {
      const sourcePage = pageMap.get(rel.scraped_page_id);
      if (sourcePage) {
        mediaItems.push({
          id: upload.id,
          type: upload.dataset_type as "pdf" | "image" | "audio" | "video",
          url: upload.original_url,
          status: upload.status,
          fileName: upload.file_name || undefined,
          discoveredAt: rel.discovered_at,
          sourcePageId: rel.scraped_page_id,
          sourcePageTitle: sourcePage.title,
          sourcePageUrl: sourcePage.url,
        });
      }
    }
  });

  return mediaItems;
}
