"use client";

import EntityTab from "./EntityTab";

interface PeopleTabProps {
  content: string | null;
}

export default function PeopleTab({ content }: PeopleTabProps) {
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
        const response = await fetch("/api/entities/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entity),
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
    const response = await fetch("/api/entities/people");
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || errorData.error || "Failed to fetch people";
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.people || [];
  };

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
