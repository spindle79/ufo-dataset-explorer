"use client";

import React, { useState, useEffect } from "react";
import { AiGeneration } from "./GenerationViewer";
import DiffViewer from "./DiffViewer";
import Tooltip from "./Tooltip";
import ViewModeToggle, { ViewMode as ViewModeType } from "./ViewModeToggle";
import {
  Check,
  Star,
  Download,
  Eye,
  X,
  FileText,
  Maximize2,
} from "lucide-react";

export type ViewMode = ViewModeType;

interface TranscriptionTableProps {
  generations: AiGeneration[];
  currentGenerationId: string | null;
  sourceType: "audio" | "pdf" | "web";
  sourceId: string;
  onSetCurrent: (generationId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  className?: string;
  // View mode configuration
  defaultViewMode?: ViewMode;
  enableViewModeToggle?: boolean;
  // Expanded view configuration
  renderExpandedContent?: (generation: AiGeneration) => React.ReactNode;
}

export default function TranscriptionTable({
  generations,
  currentGenerationId,
  sourceType,
  sourceId,
  onSetCurrent,
  onRefresh,
  className = "",
  defaultViewMode = "normal",
  enableViewModeToggle = true,
  renderExpandedContent,
}: TranscriptionTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Update showDiff when selection changes
  useEffect(() => {
    if (selectedIds.size === 2) {
      setShowDiff(true);
    } else {
      setShowDiff(false);
    }
  }, [selectedIds]);

  const handleCheckboxChange = (generationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(generationId)) {
        next.delete(generationId);
      } else {
        if (next.size >= 2) {
          // Remove the oldest selection if we're at max
          const ids = Array.from(next);
          next.delete(ids[0]);
        }
        next.add(generationId);
      }
      return next;
    });
  };

  const handleSetCurrent = async (generationId: string) => {
    setSettingCurrent(generationId);
    try {
      await onSetCurrent(generationId);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Failed to set current generation:", error);
    } finally {
      setSettingCurrent(null);
    }
  };

  const handleDownload = (generation: AiGeneration) => {
    const content = generation.text_content || "";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const serviceName =
      generation.metadata?.service ||
      generation.generation_type?.replace(/^(transcript|extraction)-/, "") ||
      "generation";
    const date = new Date(generation.created_at).toISOString().split("T")[0];
    link.download = `${sourceType}-${sourceId}-${serviceName}-v${generation.version}-${date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSelectedGenerations = (): [
    AiGeneration | null,
    AiGeneration | null
  ] => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length === 0) {
      return [null, null];
    }
    if (selectedArray.length === 1) {
      const gen = generations.find((g) => g.id === selectedArray[0]);
      return [gen || null, null];
    }
    const gen1 = generations.find((g) => g.id === selectedArray[0]);
    const gen2 = generations.find((g) => g.id === selectedArray[1]);
    // Sort by created_at so left is older, right is newer
    if (gen1 && gen2) {
      const date1 = new Date(gen1.created_at).getTime();
      const date2 = new Date(gen2.created_at).getTime();
      return date1 < date2 ? [gen1, gen2] : [gen2, gen1];
    }
    return [gen1 || null, gen2 || null];
  };

  const [leftGen, rightGen] = getSelectedGenerations();

  const getServiceName = (generation: AiGeneration): string => {
    return (
      generation.metadata?.service ||
      generation.generation_type?.replace(/^(transcript|extraction)-/, "") ||
      "unknown"
    );
  };


  const toggleExpanded = (generationId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(generationId)) {
        next.delete(generationId);
      } else {
        next.add(generationId);
      }
      return next;
    });
  };

  if (generations.length === 0) {
    return (
      <div
        className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}
      >
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No transcriptions/generations found</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* View Mode Toggle */}
      {enableViewModeToggle && (
        <div className="flex items-center justify-end">
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            idPrefix="view-mode-transcription"
          />
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-view-mode={viewMode} data-table-type="transcription">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === generations.length &&
                      generations.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Select up to 2
                        const ids = new Set<string>();
                        for (
                          let i = 0;
                          i < Math.min(2, generations.length);
                          i++
                        ) {
                          ids.add(generations[i].id);
                        }
                        setSelectedIds(ids);
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                  Service
                </th>
                <th className="text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                  Version
                </th>
                {(viewMode === "normal" || viewMode === "expanded") && (
                  <th className="text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Preview
                  </th>
                )}
                <th className="text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {generations.map((gen) => {
                const isCurrent = currentGenerationId === gen.id;
                const isSelected = selectedIds.has(gen.id);
                const preview =
                  gen.text_content?.substring(0, 100) || "No content";
                const isSettingCurrent = settingCurrent === gen.id;
                const isExpanded = expandedRows.has(gen.id);
                const showExpandedContent =
                  viewMode === "expanded" && renderExpandedContent;
                // Calculate colSpan based on view mode (before type narrowing)
                const currentViewMode = viewMode;
                const colSpan = currentViewMode === "condensed" ? 5 : 6;

                return (
                  <React.Fragment key={gen.id}>
                    <tr
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        isCurrent ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCheckboxChange(gen.id)}
                          disabled={!isSelected && selectedIds.size >= 2}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="text-sm text-gray-900 dark:text-gray-100">
                        {new Date(gen.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                          {getServiceName(gen)}
                        </span>
                      </td>
                      <td className="text-sm text-gray-900 dark:text-gray-100">
                        {gen.version}
                        {isCurrent && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                            Current
                          </span>
                        )}
                      </td>
                      {(viewMode === "normal" || viewMode === "expanded") && (
                        <td className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                          {preview}
                          {gen.text_content &&
                            gen.text_content.length > 100 &&
                            "..."}
                        </td>
                      )}
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          {!isCurrent && (
                            <Tooltip
                              id={`set-current-${gen.id}`}
                              content="Set as <b>current</b> active transcription"
                              html
                            >
                              <button
                                onClick={() => handleSetCurrent(gen.id)}
                                disabled={isSettingCurrent}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                              >
                                {isSettingCurrent ? (
                                  <Star className="w-4 h-4 animate-pulse" />
                                ) : (
                                  <Star className="w-4 h-4" />
                                )}
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip
                            id={`download-transcription-${gen.id}`}
                            content="Download transcription as <b>text file</b>"
                            html
                          >
                            <button
                              onClick={() => handleDownload(gen)}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip
                            id={`view-transcription-${gen.id}`}
                            content="View <b>full</b> transcription"
                            html
                          >
                            <button
                              onClick={() =>
                                setViewingId(viewingId === gen.id ? null : gen.id)
                              }
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          {showExpandedContent && (
                            <Tooltip
                              id={`expand-transcription-${gen.id}`}
                              content={isExpanded ? "Collapse <b>expanded</b> view" : "Expand or <u>collapse</u> full text"}
                              html
                            >
                              <button
                                onClick={() => toggleExpanded(gen.id)}
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <X className="w-4 h-4" />
                                ) : (
                                  <Maximize2 className="w-4 h-4" />
                                )}
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded content row */}
                    {showExpandedContent && isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={colSpan}>
                          <div className="space-y-2">
                            {renderExpandedContent(gen)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-600">
              <h3 className="text-lg font-semibold">View Generation</h3>
              <button
                onClick={() => setViewingId(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const gen = generations.find((g) => g.id === viewingId);
                if (!gen) return null;
                return (
                  <div>
                    <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        Version {gen.version} •{" "}
                        {new Date(gen.created_at).toLocaleString()}
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                          {getServiceName(gen)}
                        </span>
                        {currentGenerationId === gen.id && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {gen.text_content || "No content available"}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Diff View */}
      {showDiff && selectedIds.size === 2 && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Compare Generations</h3>
            <button
              onClick={() => {
                setShowDiff(false);
                setSelectedIds(new Set());
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[600px]">
            <DiffViewer left={leftGen} right={rightGen} />
          </div>
          {/* Actions for selected items */}
          <div className="mt-4 flex items-center gap-4 pt-4 border-t border-gray-300 dark:border-gray-600">
            {leftGen && currentGenerationId !== leftGen.id && (
              <button
                onClick={() => handleSetCurrent(leftGen.id)}
                disabled={settingCurrent === leftGen.id}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Make Left Current
              </button>
            )}
            {rightGen && currentGenerationId !== rightGen.id && (
              <button
                onClick={() => handleSetCurrent(rightGen.id)}
                disabled={settingCurrent === rightGen.id}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Make Right Current
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectedIds.size > 0 && !showDiff && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIds.size} of {generations.length} selected
          {selectedIds.size < 2 && " (select 2 to compare)"}
        </div>
      )}
    </div>
  );
}
