"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DuplicatePair } from "@/lib/supabase-types";
import type { EntityType } from "@/lib/deduplication";
import DuplicateReviewer from "./DuplicateReviewer";
import { Loader2, Search, RefreshCw } from "lucide-react";

interface DuplicateManagerProps {
  entityType: EntityType;
}

export default function DuplicateManager({ entityType }: DuplicateManagerProps) {
  const router = useRouter();
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [record1, setRecord1] = useState<any>(null);
  const [record2, setRecord2] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [total, setTotal] = useState(0);
  const [isFinding, setIsFinding] = useState(false);

  const fetchPairs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/duplicates/${entityType}?limit=100&offset=0`);
      if (!response.ok) throw new Error("Failed to fetch duplicates");
      const data = await response.json();
      setPairs(data.pairs || []);
      setTotal(data.total || 0);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error fetching pairs:", error);
      alert("Failed to load duplicate pairs");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (pair: DuplicatePair) => {
    try {
      setLoadingRecords(true);
      
      // Fetch records based on entity type
      let record1Data: any = null;
      let record2Data: any = null;

      if (entityType === "audio" || entityType === "video" || entityType === "pdf" || entityType === "image") {
        // File-based types - fetch from original_uploads
        const response1 = await fetch(`/api/${entityType}/${pair.record1_id}`);
        const response2 = await fetch(`/api/${entityType}/${pair.record2_id}`);
        
        if (response1.ok) {
          const data1 = await response1.json();
          record1Data = data1[entityType] || data1;
        }
        if (response2.ok) {
          const data2 = await response2.json();
          record2Data = data2[entityType] || data2;
        }
      } else if (entityType === "people" || entityType === "locations" || entityType === "companies" || entityType === "programs") {
        const tableName = entityType === "people" ? "people" : entityType === "locations" ? "locations" : entityType === "companies" ? "companies" : "programs";
        const response1 = await fetch(`/api/entities/${tableName}/${pair.record1_id}`);
        const response2 = await fetch(`/api/entities/${tableName}/${pair.record2_id}`);
        
        if (response1.ok) {
          const data1 = await response1.json();
          record1Data = data1[tableName.slice(0, -1)] || data1; // Remove 's' from plural
        }
        if (response2.ok) {
          const data2 = await response2.json();
          record2Data = data2[tableName.slice(0, -1)] || data2;
        }
      } else if (entityType === "scrape") {
        const response1 = await fetch(`/api/scrape/${pair.record1_id}`);
        const response2 = await fetch(`/api/scrape/${pair.record2_id}`);
        
        if (response1.ok) {
          const data1 = await response1.json();
          record1Data = data1.scrape || data1;
        }
        if (response2.ok) {
          const data2 = await response2.json();
          record2Data = data2.scrape || data2;
        }
      }

      setRecord1(record1Data);
      setRecord2(record2Data);
    } catch (error) {
      console.error("Error fetching records:", error);
      alert("Failed to load records");
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, [entityType]);

  useEffect(() => {
    if (pairs.length > 0 && currentIndex < pairs.length) {
      fetchRecords(pairs[currentIndex]);
    }
  }, [pairs, currentIndex, entityType]);

  const handleAction = async (
    action: "not-duplicate" | "skip" | "merge",
    mergeData?: Record<string, "record1" | "record2">
  ) => {
    if (currentIndex >= pairs.length) return;

    const pair = pairs[currentIndex];
    let url = `/api/duplicates/${entityType}/${pair.id}`;
    let method = "PATCH";
    let body: any = { action };

    if (action === "merge") {
      url = `/api/duplicates/${entityType}/${pair.id}/merge`;
      method = "POST";
      body = { mergeData };
    } else if (action === "not-duplicate") {
      body.action = "mark-not-duplicate";
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to perform action");
      }

      // Remove the pair from the list
      const newPairs = pairs.filter((p) => p.id !== pair.id);
      setPairs(newPairs);
      setTotal(total - 1);

      // Move to next pair (or stay at current index if we removed the current one)
      if (currentIndex >= newPairs.length && newPairs.length > 0) {
        setCurrentIndex(newPairs.length - 1);
      }
    } catch (error) {
      console.error("Error performing action:", error);
      throw error;
    }
  };

  const handleFindDuplicates = async () => {
    try {
      setIsFinding(true);
      const response = await fetch(`/api/duplicates/${entityType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find", minSimilarity: 0.6 }),
      });

      if (!response.ok) throw new Error("Failed to find duplicates");
      const data = await response.json();
      
      alert(`Found ${data.pairsFound} potential duplicate pairs`);
      await fetchPairs(); // Refresh the list
    } catch (error) {
      console.error("Error finding duplicates:", error);
      alert("Failed to find duplicates");
    } finally {
      setIsFinding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No duplicate pairs found for {entityType}</p>
        <button
          onClick={handleFindDuplicates}
          disabled={isFinding}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isFinding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Find Potential Duplicates
        </button>
      </div>
    );
  }

  const currentPair = pairs[currentIndex];
  const progress = ((currentIndex + 1) / total) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Duplicates</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentIndex + 1} of {total} pairs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFindDuplicates}
            disabled={isFinding}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {isFinding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Find More
          </button>
          <button
            onClick={fetchPairs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Duplicate Reviewer */}
      {loadingRecords ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : record1 && record2 ? (
        <DuplicateReviewer
          entityType={entityType}
          pair={currentPair}
          record1={record1}
          record2={record2}
          onAction={handleAction}
          onNext={() => {
            if (currentIndex < pairs.length - 1) {
              setCurrentIndex(currentIndex + 1);
            }
          }}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load records</p>
        </div>
      )}
    </div>
  );
}

