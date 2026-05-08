"use client";

import EntityTab from "./EntityTab";
import PeopleDataTable from "../PeopleDataTable";
import { getPeopleTableConfig } from "@/lib/people-table-config";
import type { SourceType } from "@/lib/entity-relationships";

interface PeopleTabProps {
  content: string | null;
  sourceType?: SourceType;
  sourceId?: string;
}

export default function PeopleTab({
  content,
  sourceType,
  sourceId,
}: PeopleTabProps) {
  const handleExtract = async (content: string) => {
    const response = await fetch("/api/entities/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, model: "gpt-5-nano" }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to extract entities");
    }

    return await response.json();
  };

  const handleSave = async (entities: any[]) => {
    // Save entities one by one to handle duplicates gracefully
    const results = [];
    for (const entity of entities) {
      try {
        const body: any = { ...entity };
        if (sourceType && sourceId) {
          body.source_type = sourceType;
          body.source_id = sourceId;
        }

        const response = await fetch("/api/entities/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          results.push(await response.json());
        } else {
          // If it's a duplicate or other error, log but continue
          const error = await response.json();
          console.warn(`Failed to save ${entity.name}:`, error.message);
        }
      } catch (err) {
        console.warn(`Failed to save ${entity.name}:`, err);
      }
    }

    if (results.length === 0) {
      throw new Error("Failed to save any entities");
    }
  };

  const fetchExisting = async () => {
    const url = new URL("/api/entities/people", window.location.origin);
    if (sourceType && sourceId) {
      url.searchParams.set("source_type", sourceType);
      url.searchParams.set("source_id", sourceId);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || errorData.error || "Failed to fetch people";
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.people || [];
  };

  // If we have source info, show the DataTable with actions
  if (sourceType && sourceId) {
    return (
      <div className="space-y-6">
        <EntityTab
          entityType="people"
          entityLabel="People"
          content={content}
          onExtract={handleExtract}
          onSave={handleSave}
          fetchExisting={fetchExisting}
        />
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">People from this source</h3>
          <PeopleDataTable 
            initialLimit={50}
            sourceType={sourceType}
            sourceId={sourceId}
          />
        </div>
      </div>
    );
  }

  // Otherwise, show the regular EntityTab
  return (
    <EntityTab
      entityType="people"
      entityLabel="People"
      content={content}
      onExtract={handleExtract}
      onSave={handleSave}
      fetchExisting={fetchExisting}
    />
  );
}
