"use client";

import { useState, useEffect } from "react";
import { Loader2, Wand2, Plus, X, Check, AlertCircle } from "lucide-react";

interface Entity {
  id: string;
  name: string;
  aliases: string[];
  [key: string]: any; // For additional fields like description, coordinates, etc.
}

interface EntityTabProps {
  entityType: "people" | "locations" | "companies" | "programs";
  entityLabel: string;
  content: string | null;
  onExtract: (content: string) => Promise<any>;
  onSave: (entities: Entity[]) => Promise<void>;
  fetchExisting: () => Promise<Entity[]>;
}

export default function EntityTab({
  entityType,
  entityLabel,
  content,
  onExtract,
  onSave,
  fetchExisting,
}: EntityTabProps) {
  const [existingEntities, setExistingEntities] = useState<Entity[]>([]);
  const [extractedEntities, setExtractedEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing entities on mount
  useEffect(() => {
    loadExisting();
  }, []);

  const loadExisting = async () => {
    setLoading(true);
    setError(null);
    try {
      const entities = await fetchExisting();
      setExistingEntities(entities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entities");
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!content || content.trim().length === 0) {
      setError("No content available to extract entities from");
      return;
    }

    setExtracting(true);
    setError(null);
    setExtractedEntities([]);

    try {
      const response = await onExtract(content);
      const entities = response.entities[entityType] || [];
      setExtractedEntities(entities);

      if (entities.length === 0) {
        setSuccess(`No ${entityLabel} found in the content`);
      } else {
        setSuccess(`Found ${entities.length} ${entityLabel}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to extract ${entityLabel}`
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (extractedEntities.length === 0) {
      setError("No entities to save");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(extractedEntities);
      setSuccess(
        `Successfully saved ${extractedEntities.length} ${entityLabel}`
      );
      setExtractedEntities([]);
      await loadExisting(); // Refresh existing entities
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to save ${entityLabel}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDismissSuccess = () => {
    setSuccess(null);
  };

  const handleDismissError = () => {
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Extract Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Extract {entityLabel}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use AI to identify {entityLabel.toLowerCase()} mentioned in the
            content
          </p>
        </div>
        <button
          onClick={handleExtract}
          disabled={extracting || !content || content.trim().length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Extract {entityLabel}
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismissError}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">
              {success}
            </p>
          </div>
          <button
            onClick={handleDismissSuccess}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Extracted Entities */}
      {extractedEntities.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">
              Extracted {entityLabel} ({extractedEntities.length})
            </h4>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Save All
                </>
              )}
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {extractedEntities.map((entity, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {entity.name}
                </div>
                {entity.aliases && entity.aliases.length > 0 && (
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    Aliases: {entity.aliases.join(", ")}
                  </div>
                )}
                {entity.description && (
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {entity.description}
                  </div>
                )}
                {entity.latitude !== undefined &&
                  entity.longitude !== undefined && (
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      Coordinates: {entity.latitude}, {entity.longitude}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Entities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">
            Existing {entityLabel} ({existingEntities.length})
          </h4>
          <button
            onClick={loadExisting}
            disabled={loading}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : existingEntities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No {entityLabel.toLowerCase()} found
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {existingEntities.map((entity) => (
              <div
                key={entity.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {entity.name}
                </div>
                {entity.aliases && entity.aliases.length > 0 && (
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    Aliases: {entity.aliases.join(", ")}
                  </div>
                )}
                {entity.description && (
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {entity.description}
                  </div>
                )}
                {entity.latitude !== undefined &&
                  entity.longitude !== undefined && (
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      Coordinates: {entity.latitude}, {entity.longitude}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
