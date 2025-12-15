"use client";

import React from "react";
import { AiGeneration } from "./GenerationViewer";

interface DiffViewerProps {
  left: AiGeneration | null;
  right: AiGeneration | null;
  className?: string;
}

interface DiffLine {
  type: "equal" | "delete" | "insert";
  content: string;
  lineNumber?: number;
}

// Simple line-based diff algorithm
function computeDiff(leftText: string, rightText: string): DiffLine[] {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const result: DiffLine[] = [];

  // Simple longest common subsequence approach
  const maxLen = Math.max(leftLines.length, rightLines.length);
  let leftIdx = 0;
  let rightIdx = 0;
  let lineNum = 1;

  while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
    if (leftIdx >= leftLines.length) {
      // Only right has content
      result.push({
        type: "insert",
        content: rightLines[rightIdx],
        lineNumber: lineNum++,
      });
      rightIdx++;
    } else if (rightIdx >= rightLines.length) {
      // Only left has content
      result.push({
        type: "delete",
        content: leftLines[leftIdx],
        lineNumber: lineNum++,
      });
      leftIdx++;
    } else if (leftLines[leftIdx] === rightLines[rightIdx]) {
      // Lines match
      result.push({
        type: "equal",
        content: leftLines[leftIdx],
        lineNumber: lineNum++,
      });
      leftIdx++;
      rightIdx++;
    } else {
      // Lines differ - check if right line appears later in left
      const rightLineInLeft = leftLines
        .slice(leftIdx + 1)
        .indexOf(rightLines[rightIdx]);
      // Check if left line appears later in right
      const leftLineInRight = rightLines
        .slice(rightIdx + 1)
        .indexOf(leftLines[leftIdx]);

      if (
        rightLineInLeft !== -1 &&
        rightLineInLeft <
          (leftLineInRight === -1 ? Infinity : leftLineInRight + 1)
      ) {
        // Right line appears later in left, mark left as deleted
        result.push({
          type: "delete",
          content: leftLines[leftIdx],
          lineNumber: lineNum++,
        });
        leftIdx++;
      } else if (leftLineInRight !== -1) {
        // Left line appears later in right, mark right as inserted
        result.push({
          type: "insert",
          content: rightLines[rightIdx],
          lineNumber: lineNum++,
        });
        rightIdx++;
      } else {
        // Both lines are different and don't appear later
        result.push({
          type: "delete",
          content: leftLines[leftIdx],
          lineNumber: lineNum++,
        });
        result.push({
          type: "insert",
          content: rightLines[rightIdx],
          lineNumber: lineNum++,
        });
        leftIdx++;
        rightIdx++;
      }
    }
  }

  return result;
}

export default function DiffViewer({
  left,
  right,
  className = "",
}: DiffViewerProps) {
  if (!left && !right) {
    return (
      <div
        className={`flex items-center justify-center p-8 text-gray-500 dark:text-gray-400 ${className}`}
      >
        <p>Select two transcriptions to compare</p>
      </div>
    );
  }

  if (!left || !right) {
    const single = left || right;
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900 overflow-auto">
          <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            {single ? (
              <>
                Version {single.version} •{" "}
                {new Date(single.created_at).toLocaleString()}
                {single.metadata?.service && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                    {single.metadata.service}
                  </span>
                )}
              </>
            ) : (
              "No content"
            )}
          </div>
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {single?.text_content || "No content available"}
          </pre>
        </div>
      </div>
    );
  }

  const leftText = left.text_content || "";
  const rightText = right.text_content || "";
  const diff = computeDiff(leftText, rightText);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Headers */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="font-semibold">Left</div>
            <div>
              Version {left.version} •{" "}
              {new Date(left.created_at).toLocaleString()}
              {left.metadata?.service && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                  {left.metadata.service}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="border-b border-gray-300 dark:border-gray-600 pb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="font-semibold">Right</div>
            <div>
              Version {right.version} •{" "}
              {new Date(right.created_at).toLocaleString()}
              {right.metadata?.service && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs capitalize">
                  {right.metadata.service}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-auto">
        {/* Left Column */}
        <div className="border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 overflow-auto">
          <pre className="p-4 whitespace-pre-wrap text-sm font-mono">
            {diff.map((line, idx) => {
              if (line.type === "delete" || line.type === "equal") {
                return (
                  <div
                    key={idx}
                    className={
                      line.type === "delete"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                        : ""
                    }
                  >
                    {line.content}
                  </div>
                );
              }
              return null;
            })}
          </pre>
        </div>

        {/* Right Column */}
        <div className="border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 overflow-auto">
          <pre className="p-4 whitespace-pre-wrap text-sm font-mono">
            {diff.map((line, idx) => {
              if (line.type === "insert" || line.type === "equal") {
                return (
                  <div
                    key={idx}
                    className={
                      line.type === "insert"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        : ""
                    }
                  >
                    {line.content}
                  </div>
                );
              }
              return null;
            })}
          </pre>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700"></div>
          <span>Deleted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"></div>
          <span>Added</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-transparent border border-gray-300 dark:border-gray-600"></div>
          <span>Unchanged</span>
        </div>
      </div>
    </div>
  );
}
