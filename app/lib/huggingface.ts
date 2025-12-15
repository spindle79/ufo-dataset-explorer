import { snapshotDownload } from "@huggingface/hub";
import * as fs from "fs/promises";
import * as path from "path";

const DATASET_NAME = "cjc0013/Ufo_data_clustered";

let cachedDataset: any = null;

/**
 * Load the UFO dataset from Hugging Face
 * Uses caching to avoid reloading on every request
 *
 * NOTE: @huggingface/hub v2 API changed significantly. This function now downloads
 * the dataset files and needs to parse them. The dataset format (Parquet/Arrow/JSON)
 * needs to be determined and parsed accordingly.
 *
 * TODO: Implement proper dataset parsing after download
 */
export async function loadHuggingFaceDataset() {
  if (cachedDataset) {
    return cachedDataset;
  }

  const token = process.env.HUGGINGFACE_TOKEN;

  try {
    // Download dataset snapshot
    const localDir = await snapshotDownload({
      repo: DATASET_NAME,
      repoType: "dataset",
      token: token || undefined,
    });

    // TODO: Parse the downloaded dataset files
    // The dataset is likely in Parquet or Arrow format
    // For now, this is a placeholder that needs implementation
    // Check the localDir for dataset files and parse them

    cachedDataset = {
      localDir,
      // Add parsed dataset data here once parsing is implemented
      toArray: async () => {
        throw new Error(
          "Dataset parsing not yet implemented for @huggingface/hub v2. Please use local dataset files instead."
        );
      },
    };

    return cachedDataset;
  } catch (error) {
    console.error("Failed to load dataset from Hugging Face:", error);
    throw new Error(
      "Failed to load dataset. Please check your connection and credentials."
    );
  }
}

/**
 * Clear the cached dataset (useful for testing or refreshing)
 */
export function clearDatasetCache() {
  cachedDataset = null;
}
