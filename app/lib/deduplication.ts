/**
 * Deduplication Utilities
 * 
 * Provides functions to find potential duplicate records across different entity types
 * using various matching strategies: filename similarity, URL similarity, name similarity,
 * substring matches, etc.
 */

import { createAdminClient } from "./supabase/server";
import type { DuplicatePair, DuplicatePairCreate } from "./supabase-types";
import type { BaseFile } from "./file-base";
import type { People, Locations, Companies, Programs, ScrapedPage } from "./supabase-types";
import { getCanonicalUrl } from "./url-utils";

export type EntityType =
  | "audio"
  | "video"
  | "pdf"
  | "image"
  | "scrape"
  | "people"
  | "locations"
  | "companies"
  | "programs";

export interface SimilarityResult {
  score: number; // 0.0 to 1.0
  reasons: string[]; // Array of reasons why they're similar
}

/**
 * Normalize a string for comparison (lowercase, trim, remove special chars)
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0.0 to 1.0)
 */
function stringSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (normalized1 === normalized2) return 1.0;
  if (normalized1.length === 0 || normalized2.length === 0) return 0.0;

  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const minLen = Math.min(normalized1.length, normalized2.length);
    const maxLen = Math.max(normalized1.length, normalized2.length);
    return minLen / maxLen;
  }

  // Use Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLen = Math.max(normalized1.length, normalized2.length);
  return 1.0 - distance / maxLen;
}

/**
 * Extract filename from URL or path
 */
function extractFilename(urlOrPath: string | null | undefined): string {
  if (!urlOrPath) return "";
  try {
    const url = new URL(urlOrPath);
    const pathname = url.pathname;
    return pathname.split("/").pop() || "";
  } catch {
    // Not a URL, treat as path
    return urlOrPath.split("/").pop() || "";
  }
}

/**
 * Normalize URL for comparison (remove protocol, www, trailing slashes, but keep query strings)
 */
function normalizeUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    let normalized = urlObj.hostname.replace(/^www\./, "");
    normalized += urlObj.pathname.replace(/\/$/, "");
    // Include query string for better matching (e.g., ?id=194553)
    if (urlObj.search) {
      normalized += urlObj.search;
    }
    return normalized.toLowerCase();
  } catch {
    return normalizeString(url);
  }
}

/**
 * Calculate similarity between two file-based records (audio, video, pdf, image)
 */
function calculateFileSimilarity(
  record1: BaseFile,
  record2: BaseFile
): SimilarityResult {
  const reasons: string[] = [];
  let totalScore = 0;
  let weightSum = 0;

  // Filename similarity (weight: 0.4)
  const filename1 = normalizeString(record1.fileName);
  const filename2 = normalizeString(record2.fileName);
  if (filename1 && filename2) {
    const filenameScore = stringSimilarity(filename1, filename2);
    if (filenameScore > 0.5) {
      reasons.push("filename_match");
      totalScore += filenameScore * 0.4;
      weightSum += 0.4;
    }
  }

  // URL similarity (weight: 0.3)
  const url1 = normalizeUrl(record1.originalUrl || "");
  const url2 = normalizeUrl(record2.originalUrl || "");
  if (url1 && url2) {
    const urlScore = stringSimilarity(url1, url2);
    if (urlScore > 0.5) {
      reasons.push("url_match");
      totalScore += urlScore * 0.3;
      weightSum += 0.3;
    }
  }

  // Extract filename from URL and compare (weight: 0.2)
  if (record1.originalUrl && record2.originalUrl) {
    const urlFilename1 = normalizeString(extractFilename(record1.originalUrl));
    const urlFilename2 = normalizeString(extractFilename(record2.originalUrl));
    if (urlFilename1 && urlFilename2 && urlFilename1 !== filename1 && urlFilename2 !== filename2) {
      const urlFilenameScore = stringSimilarity(urlFilename1, urlFilename2);
      if (urlFilenameScore > 0.5) {
        reasons.push("url_filename_match");
        totalScore += urlFilenameScore * 0.2;
        weightSum += 0.2;
      }
    }
  }

  // Description similarity (weight: 0.1)
  const desc1 = normalizeString(record1.description);
  const desc2 = normalizeString(record2.description);
  if (desc1 && desc2 && desc1.length > 10 && desc2.length > 10) {
    const descScore = stringSimilarity(desc1, desc2);
    if (descScore > 0.6) {
      reasons.push("description_match");
      totalScore += descScore * 0.1;
      weightSum += 0.1;
    }
  }

  // Normalize score by weight sum
  const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

  return {
    score: Math.min(1.0, finalScore),
    reasons,
  };
}

/**
 * Calculate similarity between two people records
 */
function calculatePeopleSimilarity(
  record1: People,
  record2: People
): SimilarityResult {
  const reasons: string[] = [];
  let totalScore = 0;
  let weightSum = 0;

  // Name similarity (weight: 0.6)
  const name1 = normalizeString(record1.name);
  const name2 = normalizeString(record2.name);
  if (name1 && name2) {
    const nameScore = stringSimilarity(name1, name2);
    if (nameScore > 0.5) {
      reasons.push("name_match");
      totalScore += nameScore * 0.6;
      weightSum += 0.6;
    }
  }

  // Check aliases (weight: 0.4)
  const aliases1 = (record1.aliases || []).map((a) => normalizeString(a));
  const aliases2 = (record2.aliases || []).map((a) => normalizeString(a));

  let aliasMatch = false;
  for (const alias1 of aliases1) {
    for (const alias2 of aliases2) {
      if (alias1 && alias2) {
        const aliasScore = stringSimilarity(alias1, alias2);
        if (aliasScore > 0.7) {
          aliasMatch = true;
          reasons.push("alias_match");
          totalScore += aliasScore * 0.4;
          weightSum += 0.4;
          break;
        }
      }
    }
    if (aliasMatch) break;
  }

  // Check if name matches alias
  if (!aliasMatch) {
    for (const alias of aliases1) {
      if (alias && name2) {
        const score = stringSimilarity(alias, name2);
        if (score > 0.7) {
          reasons.push("name_alias_match");
          totalScore += score * 0.4;
          weightSum += 0.4;
          break;
        }
      }
    }
    for (const alias of aliases2) {
      if (alias && name1) {
        const score = stringSimilarity(alias, name1);
        if (score > 0.7) {
          reasons.push("name_alias_match");
          totalScore += score * 0.4;
          weightSum += 0.4;
          break;
        }
      }
    }
  }

  const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

  return {
    score: Math.min(1.0, finalScore),
    reasons,
  };
}

/**
 * Calculate similarity between two location records
 */
function calculateLocationSimilarity(
  record1: Locations,
  record2: Locations
): SimilarityResult {
  const reasons: string[] = [];
  let totalScore = 0;
  let weightSum = 0;

  // Name similarity (weight: 0.4)
  const name1 = normalizeString(record1.name);
  const name2 = normalizeString(record2.name);
  if (name1 && name2) {
    const nameScore = stringSimilarity(name1, name2);
    if (nameScore > 0.5) {
      reasons.push("name_match");
      totalScore += nameScore * 0.4;
      weightSum += 0.4;
    }
  }

  // Geographic proximity (weight: 0.3) - if both have coordinates
  if (
    record1.latitude &&
    record1.longitude &&
    record2.latitude &&
    record2.longitude
  ) {
    const latDiff = Math.abs(record1.latitude - record2.latitude);
    const lonDiff = Math.abs(record1.longitude - record2.longitude);
    // Rough distance calculation (degrees)
    const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
    // Consider within ~0.01 degrees (~1km) as similar
    if (distance < 0.01) {
      reasons.push("geographic_proximity");
      totalScore += (1.0 - distance * 100) * 0.3;
      weightSum += 0.3;
    }
  }

  // City/State/Country match (weight: 0.3)
  const city1 = normalizeString(record1.city);
  const city2 = normalizeString(record2.city);
  const state1 = normalizeString(record1.state);
  const state2 = normalizeString(record2.state);
  const country1 = normalizeString(record1.country);
  const country2 = normalizeString(record2.country);

  if (city1 && city2 && city1 === city2) {
    reasons.push("city_match");
    totalScore += 0.1;
    weightSum += 0.1;
  }
  if (state1 && state2 && state1 === state2) {
    reasons.push("state_match");
    totalScore += 0.1;
    weightSum += 0.1;
  }
  if (country1 && country2 && country1 === country2) {
    reasons.push("country_match");
    totalScore += 0.1;
    weightSum += 0.1;
  }

  const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

  return {
    score: Math.min(1.0, finalScore),
    reasons,
  };
}

/**
 * Calculate similarity between two scrape records
 */
function calculateScrapeSimilarity(
  record1: ScrapedPage,
  record2: ScrapedPage
): SimilarityResult {
  const reasons: string[] = [];
  let totalScore = 0;
  let weightSum = 0;

  // Get all URL variants to compare
  const url1 = record1.url || "";
  const canonical1 = record1.canonical_url || "";
  const url2 = record2.url || "";
  const canonical2 = record2.canonical_url || "";
  
  // Check for exact matches first (case-insensitive, trim whitespace)
  const compareUrls = (u1: string, u2: string): boolean => {
    if (!u1 || !u2) return false;
    return u1.trim().toLowerCase() === u2.trim().toLowerCase();
  };
  
  // Check all combinations for exact match
  if (compareUrls(url1, url2) || 
      compareUrls(url1, canonical2) || 
      compareUrls(canonical1, url2) || 
      compareUrls(canonical1, canonical2)) {
    return {
      score: 1.0,
      reasons: ["exact_url_match"],
    };
  }
  
  // Use getCanonicalUrl to normalize both URLs the same way they were stored
  // This ensures we match using the same normalization logic
  try {
    const canonicalUrl1 = getCanonicalUrl(url1);
    const canonicalUrl2 = getCanonicalUrl(url2);
    
    if (canonicalUrl1 === canonicalUrl2) {
      return {
        score: 1.0,
        reasons: ["canonical_url_match"],
      };
    }
    
    // Also check if stored canonical_urls match
    if (canonical1 && canonical2 && canonical1 === canonical2) {
      return {
        score: 1.0,
        reasons: ["stored_canonical_url_match"],
      };
    }
  } catch (e) {
    // If canonical URL generation fails, continue with other checks
    console.warn("[Deduplication] Failed to generate canonical URLs:", e);
  }
  
  // If no exact match, try normalized comparison
  // Use canonical_url if available, otherwise use url
  const primaryUrl1 = canonical1 || url1;
  const primaryUrl2 = canonical2 || url2;
  
  if (primaryUrl1 && primaryUrl2) {
    // Try direct string similarity on the URLs
    const directSimilarity = stringSimilarity(primaryUrl1.toLowerCase(), primaryUrl2.toLowerCase());
    if (directSimilarity >= 0.99) {
      return {
        score: 1.0,
        reasons: ["near_exact_url_match"],
      };
    }
    
    // Normalized URL similarity (weight: 0.6)
    const normalizedUrl1 = normalizeUrl(primaryUrl1);
    const normalizedUrl2 = normalizeUrl(primaryUrl2);
    if (normalizedUrl1 && normalizedUrl2) {
      // Check exact match after normalization
      if (normalizedUrl1 === normalizedUrl2) {
        return {
          score: 1.0,
          reasons: ["normalized_url_match"],
        };
      }
      
      const urlScore = stringSimilarity(normalizedUrl1, normalizedUrl2);
      if (urlScore > 0.5) {
        reasons.push("url_match");
        totalScore += urlScore * 0.6;
        weightSum += 0.6;
      }
    }
  }

  // Title similarity (weight: 0.3)
  const title1 = normalizeString(record1.title);
  const title2 = normalizeString(record2.title);
  if (title1 && title2) {
    const titleScore = stringSimilarity(title1, title2);
    if (titleScore > 0.6) {
      reasons.push("title_match");
      totalScore += titleScore * 0.3;
      weightSum += 0.3;
    }
  }

  // Domain match (weight: 0.1)
  const domain1 = normalizeString(record1.domain);
  const domain2 = normalizeString(record2.domain);
  if (domain1 && domain2 && domain1 === domain2) {
    reasons.push("domain_match");
    totalScore += 0.1;
    weightSum += 0.1;
  }

  const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

  return {
    score: Math.min(1.0, finalScore),
    reasons,
  };
}

/**
 * Find potential duplicates for a given entity type
 */
export async function findPotentialDuplicates(
  entityType: EntityType,
  minSimilarity: number = 0.6
): Promise<DuplicatePair[]> {
  const supabase = createAdminClient();
  const pairs: DuplicatePair[] = [];

  try {
    if (entityType === "audio" || entityType === "video" || entityType === "pdf" || entityType === "image") {
      // For file-based types, fetch from original_uploads
      const { data: records, error } = await supabase
        .from("original_uploads")
        .select("*")
        .eq("dataset_type", entityType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length < 2) return [];

      // Convert to BaseFile-like objects and compare
      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const record1 = {
            id: records[i].id,
            fileName: records[i].file_name,
            originalUrl: records[i].original_url,
            description: records[i].metadata?.description || "",
            categories: records[i].metadata?.categories || [],
            filePath: records[i].file_path,
            fileSize: records[i].file_size || undefined,
            mimeType: records[i].mime_type || undefined,
            status: records[i].status as any,
            uploadedDate: records[i].uploaded_at,
          };
          const record2 = {
            id: records[j].id,
            fileName: records[j].file_name,
            originalUrl: records[j].original_url,
            description: records[j].metadata?.description || "",
            categories: records[j].metadata?.categories || [],
            filePath: records[j].file_path,
            fileSize: records[j].file_size || undefined,
            mimeType: records[j].mime_type || undefined,
            status: records[j].status as any,
            uploadedDate: records[j].uploaded_at,
          };

          const similarity = calculateFileSimilarity(record1, record2);
          if (similarity.score >= minSimilarity) {
            // Ensure record1_id < record2_id for consistency
            const [id1, id2] = records[i].id < records[j].id 
              ? [records[i].id, records[j].id]
              : [records[j].id, records[i].id];

            pairs.push({
              id: "", // Will be generated by database
              entity_type: entityType,
              record1_id: id1,
              record2_id: id2,
              similarity_score: similarity.score,
              similarity_reasons: similarity.reasons,
              status: "pending",
              merge_data: {},
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } else if (entityType === "people") {
      const { data: records, error } = await supabase
        .from("people")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length < 2) return [];

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const similarity = calculatePeopleSimilarity(records[i], records[j]);
          if (similarity.score >= minSimilarity) {
            const [id1, id2] = records[i].id < records[j].id 
              ? [records[i].id, records[j].id]
              : [records[j].id, records[i].id];

            pairs.push({
              id: "",
              entity_type: entityType,
              record1_id: id1,
              record2_id: id2,
              similarity_score: similarity.score,
              similarity_reasons: similarity.reasons,
              status: "pending",
              merge_data: {},
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } else if (entityType === "locations") {
      const { data: records, error } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length < 2) return [];

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const similarity = calculateLocationSimilarity(records[i], records[j]);
          if (similarity.score >= minSimilarity) {
            const [id1, id2] = records[i].id < records[j].id 
              ? [records[i].id, records[j].id]
              : [records[j].id, records[i].id];

            pairs.push({
              id: "",
              entity_type: entityType,
              record1_id: id1,
              record2_id: id2,
              similarity_score: similarity.score,
              similarity_reasons: similarity.reasons,
              status: "pending",
              merge_data: {},
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } else if (entityType === "scrape") {
      const { data: records, error } = await supabase
        .from("scraped_pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length < 2) return [];

      console.log(`[Deduplication] Checking ${records.length} scrape records for duplicates`);

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const similarity = calculateScrapeSimilarity(records[i], records[j]);
          
          // Debug logging for potential matches
          if (similarity.score > 0.3) {
            console.log(`[Deduplication] Similarity check:`, {
              record1: { id: records[i].id, url: records[i].url, canonical_url: records[i].canonical_url },
              record2: { id: records[j].id, url: records[j].url, canonical_url: records[j].canonical_url },
              score: similarity.score,
              reasons: similarity.reasons,
            });
          }
          
          // Always include exact matches (score >= 0.99) regardless of threshold
          // Otherwise use the minSimilarity threshold
          if (similarity.score >= 0.99 || similarity.score >= minSimilarity) {
            const [id1, id2] = records[i].id < records[j].id 
              ? [records[i].id, records[j].id]
              : [records[j].id, records[i].id];

            pairs.push({
              id: "",
              entity_type: entityType,
              record1_id: id1,
              record2_id: id2,
              similarity_score: similarity.score,
              similarity_reasons: similarity.reasons,
              status: "pending",
              merge_data: {},
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
      
      console.log(`[Deduplication] Found ${pairs.length} potential duplicate pairs for scrape`);
    } else if (entityType === "companies" || entityType === "programs") {
      // Similar to people - use name and aliases
      const tableName = entityType === "companies" ? "companies" : "programs";
      const { data: records, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!records || records.length < 2) return [];

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          // Convert to People-like structure for similarity calculation
          const record1 = {
            id: records[i].id,
            name: records[i].name,
            aliases: records[i].aliases || [],
          } as People;
          const record2 = {
            id: records[j].id,
            name: records[j].name,
            aliases: records[j].aliases || [],
          } as People;

          const similarity = calculatePeopleSimilarity(record1, record2);
          if (similarity.score >= minSimilarity) {
            const [id1, id2] = records[i].id < records[j].id 
              ? [records[i].id, records[j].id]
              : [records[j].id, records[i].id];

            pairs.push({
              id: "",
              entity_type: entityType,
              record1_id: id1,
              record2_id: id2,
              similarity_score: similarity.score,
              similarity_reasons: similarity.reasons,
              status: "pending",
              merge_data: {},
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Filter out existing pairs
    if (pairs.length > 0) {
      const existingPairs = await getExistingDuplicatePairs(entityType);
      const existingSet = new Set(
        existingPairs.map((p) => `${p.record1_id}:${p.record2_id}`)
      );

      const newPairs = pairs.filter(
        (p) => !existingSet.has(`${p.record1_id}:${p.record2_id}`)
      );

      // Insert new pairs
      if (newPairs.length > 0) {
        // Validate and prepare inserts
        const inserts: DuplicatePairCreate[] = newPairs
          .map((p) => {
            // Ensure similarity_score is within valid range (0.0 to 1.0)
            const score = Math.max(0.0, Math.min(1.0, p.similarity_score));
            
            // Ensure record1_id < record2_id (should already be normalized, but double-check)
            const [id1, id2] = p.record1_id < p.record2_id 
              ? [p.record1_id, p.record2_id]
              : [p.record2_id, p.record1_id];
            
            return {
              entity_type: p.entity_type,
              record1_id: id1,
              record2_id: id2,
              similarity_score: parseFloat(score.toFixed(4)), // Ensure NUMERIC(5,4) format
              similarity_reasons: p.similarity_reasons || [],
              status: "pending" as const,
            };
          })
          .filter((insert) => {
            // Filter out any invalid inserts
            if (!insert.record1_id || !insert.record2_id || insert.record1_id === insert.record2_id) {
              console.warn(`[Deduplication] Skipping invalid pair:`, insert);
              return false;
            }
            return true;
          });
        
        if (inserts.length === 0) {
          console.warn(`[Deduplication] No valid pairs to insert after validation`);
          return [];
        }

        const { error: insertError, data: insertedData } = await supabase
          .from("duplicate_pairs")
          .insert(inserts)
          .select();

        if (insertError) {
          // Extract meaningful error information from Supabase error
          const errorObj = insertError as any;
          const errorInfo = {
            message: errorObj?.message,
            code: errorObj?.code || errorObj?.status,
            details: errorObj?.details,
            hint: errorObj?.hint,
            status: errorObj?.status,
            statusText: errorObj?.statusText,
            // Check for nested error structure
            nestedMessage: errorObj?.error?.message,
            nestedDetails: errorObj?.error?.details,
            nestedHint: errorObj?.error?.hint,
            nestedCode: errorObj?.error?.code,
            // Check for body (PostgREST format)
            bodyMessage: errorObj?.body?.message,
            bodyDetails: errorObj?.body?.details,
            bodyHint: errorObj?.body?.hint,
            bodyCode: errorObj?.body?.code,
          };
          
          // Get a meaningful error message
          const errorMsg =
            errorInfo.nestedMessage || errorInfo.nestedDetails || errorInfo.nestedHint ||
            errorInfo.bodyMessage || errorInfo.bodyDetails || errorInfo.bodyHint ||
            errorInfo.message || errorInfo.details || errorInfo.hint || errorInfo.code ||
            `Unknown error: ${JSON.stringify(errorInfo)}`;
          
          console.error(`[Deduplication] Error inserting duplicate pairs:`, {
            message: errorMsg,
            code: errorInfo.code,
            details: errorInfo.details,
            hint: errorInfo.hint,
            status: errorInfo.status,
            fullError: errorInfo,
            insertsCount: inserts.length,
            firstInsert: inserts[0],
          });
          
          throw new Error(`Failed to insert duplicate pairs: ${errorMsg}`);
        }
        
        console.log(`[Deduplication] Successfully inserted ${insertedData?.length || 0} duplicate pairs`);
      }

      return newPairs;
    }

    return [];
  } catch (error) {
    // Extract meaningful error information
    let errorMessage = "Unknown error";
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = { stack: error.stack };
    } else if (error && typeof error === "object") {
      const errorObj = error as any;
      errorMessage = 
        errorObj?.message || 
        errorObj?.details || 
        errorObj?.hint || 
        errorObj?.code ||
        JSON.stringify(errorObj);
      errorDetails = {
        code: errorObj?.code,
        details: errorObj?.details,
        hint: errorObj?.hint,
        status: errorObj?.status,
      };
    } else {
      errorMessage = String(error);
    }
    
    console.error(`Error finding duplicates for ${entityType}:`, {
      message: errorMessage,
      ...errorDetails,
      errorType: error?.constructor?.name,
      errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
    });
    throw error;
  }
}

/**
 * Get existing duplicate pairs for an entity type
 */
export async function getExistingDuplicatePairs(
  entityType: EntityType
): Promise<DuplicatePair[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("duplicate_pairs")
    .select("*")
    .eq("entity_type", entityType);

  if (error) throw error;
  return data || [];
}

/**
 * Get pending duplicate pairs for review
 */
export async function getPendingDuplicates(
  entityType: EntityType,
  limit: number = 50,
  offset: number = 0
): Promise<{ pairs: DuplicatePair[]; total: number }> {
  const supabase = createAdminClient();

  // Get total count
  const { count, error: countError } = await supabase
    .from("duplicate_pairs")
    .select("*", { count: "exact", head: true })
    .eq("entity_type", entityType)
    .eq("status", "pending");

  if (countError) throw countError;

  // Get pairs, prioritizing skipped ones (they go to end)
  const { data: skippedData } = await supabase
    .from("duplicate_pairs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("status", "skipped")
    .order("updated_at", { ascending: false });

  const { data: pendingData, error } = await supabase
    .from("duplicate_pairs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("status", "pending")
    .order("similarity_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Combine: pending first, then skipped at the end
  const allPairs = [
    ...(pendingData || []),
    ...(skippedData || []),
  ];

  return {
    pairs: allPairs.slice(offset, offset + limit),
    total: (count || 0) + (skippedData?.length || 0),
  };
}

