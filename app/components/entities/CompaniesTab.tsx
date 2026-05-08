"use client";

import EntityTab from "./EntityTab";
import type { SourceType } from "@/lib/entity-relationships";

interface CompaniesTabProps {
  content: string | null;
  sourceType?: SourceType;
  sourceId?: string;
}

export default function CompaniesTab({
  content,
  sourceType,
  sourceId,
}: CompaniesTabProps) {
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

        const response = await fetch("/api/entities/companies", {
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
    const url = new URL("/api/entities/companies", window.location.origin);
    if (sourceType && sourceId) {
      url.searchParams.set("source_type", sourceType);
      url.searchParams.set("source_id", sourceId);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || errorData.error || "Failed to fetch companies";
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.companies || [];
  };

  // Note: CompaniesDataTable doesn't exist yet, so we just show EntityTab for now
  // When CompaniesDataTable is created, we can add it similar to PeopleTab
  return (
    <EntityTab
      entityType="companies"
      entityLabel="Companies"
      content={content}
      onExtract={handleExtract}
      onSave={handleSave}
      fetchExisting={fetchExisting}
    />
  );
}
