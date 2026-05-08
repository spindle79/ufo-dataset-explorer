"use client";

import React, { useState, useEffect } from "react";
import type { DuplicatePair } from "@/lib/supabase-types";
import type { EntityType } from "@/lib/deduplication";
import { X, SkipForward, GitMerge, Loader2 } from "lucide-react";

interface DuplicateReviewerProps {
  entityType: EntityType;
  pair: DuplicatePair;
  record1: any;
  record2: any;
  onAction: (action: "not-duplicate" | "skip" | "merge", mergeData?: Record<string, "record1" | "record2">) => Promise<void>;
  onNext: () => void;
}

export default function DuplicateReviewer({
  entityType,
  pair,
  record1,
  record2,
  onAction,
  onNext,
}: DuplicateReviewerProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, "record1" | "record2">>({});
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize field selections
  useEffect(() => {
    const fields: Record<string, "record1" | "record2"> = {};
    const allFields = new Set([...Object.keys(record1 || {}), ...Object.keys(record2 || {})]);
    
    for (const field of allFields) {
      if (field === "id" || field === "created_at" || field === "updated_at") {
        // Always use record1 for these
        fields[field] = "record1";
      } else {
        // Default: prefer record1 if it has a value, otherwise record2
        const val1 = record1?.[field];
        const val2 = record2?.[field];
        if (val1 !== null && val1 !== undefined && val1 !== "") {
          fields[field] = "record1";
        } else if (val2 !== null && val2 !== undefined && val2 !== "") {
          fields[field] = "record2";
        } else {
          fields[field] = "record1"; // Default to record1
        }
      }
    }
    
    setSelectedFields(fields);
  }, [record1, record2]);

  const handleAction = async (action: "not-duplicate" | "skip" | "merge") => {
    if (action === "merge" && !showMergeDialog) {
      setShowMergeDialog(true);
      return;
    }

    setIsProcessing(true);
    try {
      if (action === "merge") {
        await onAction("merge", selectedFields);
      } else {
        await onAction(action);
      }
      onNext();
    } catch (error) {
      console.error("Error performing action:", error);
      alert("Failed to perform action. Please try again.");
    } finally {
      setIsProcessing(false);
      setShowMergeDialog(false);
    }
  };

  const getFieldValue = (record: any, field: string): string => {
    const value = record?.[field];
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getFieldDisplayName = (field: string): string => {
    return field
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const isEditableField = (field: string): boolean => {
    return !["id", "created_at", "updated_at"].includes(field);
  };

  const allFields = new Set([
    ...Object.keys(record1 || {}),
    ...Object.keys(record2 || {}),
  ]);

  return (
    <div className="space-y-6">
      {/* Similarity Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Similarity Score: {(pair.similarity_score * 100).toFixed(1)}%
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Reasons: {pair.similarity_reasons.join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Record 1 */}
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Record 1</h3>
            <span className="text-xs text-gray-500">ID: {record1?.id?.substring(0, 8)}...</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Array.from(allFields).map((field) => {
              const value = getFieldValue(record1, field);
              const isSelected = selectedFields[field] === "record1";
              return (
                <div key={field} className="border-b pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getFieldDisplayName(field)}
                    </label>
                    {showMergeDialog && isEditableField(field) && (
                      <input
                        type="radio"
                        name={`field-${field}`}
                        checked={isSelected}
                        onChange={() =>
                          setSelectedFields({ ...selectedFields, [field]: "record1" })
                        }
                        className="ml-2"
                      />
                    )}
                  </div>
                  <div
                    className={`text-sm ${
                      isSelected && showMergeDialog
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {value || <span className="italic text-gray-400">(empty)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Record 2 */}
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Record 2</h3>
            <span className="text-xs text-gray-500">ID: {record2?.id?.substring(0, 8)}...</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Array.from(allFields).map((field) => {
              const value = getFieldValue(record2, field);
              const isSelected = selectedFields[field] === "record2";
              return (
                <div key={field} className="border-b pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getFieldDisplayName(field)}
                    </label>
                    {showMergeDialog && isEditableField(field) && (
                      <input
                        type="radio"
                        name={`field-${field}`}
                        checked={isSelected}
                        onChange={() =>
                          setSelectedFields({ ...selectedFields, [field]: "record2" })
                        }
                        className="ml-2"
                      />
                    )}
                  </div>
                  <div
                    className={`text-sm ${
                      isSelected && showMergeDialog
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {value || <span className="italic text-gray-400">(empty)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-500">
          {showMergeDialog
            ? "Select which fields to keep from each record, then click Merge"
            : "Choose an action for this duplicate pair"}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleAction("not-duplicate")}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Not Duplicate
          </button>
          <button
            onClick={() => handleAction("skip")}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={() => handleAction("merge")}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4" />
            )}
            {showMergeDialog ? "Confirm Merge" : "Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}

