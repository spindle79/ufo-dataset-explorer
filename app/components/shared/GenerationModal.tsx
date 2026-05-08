'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import GenerationViewer, { AiGeneration } from './GenerationViewer';
import ServiceSelector, { ServiceOption } from './ServiceSelector';
import MarkdownEditor from '../MarkdownEditor';
import Tooltip from './Tooltip';

export interface GenerationPreview {
  text: string;
  version: number;
  service: string;
  metadata: any;
  generationData?: any;
  saved?: boolean;
  generationId?: string;
}

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName: string;
  // Services configuration
  services: ServiceOption[];
  // Current generation
  currentGeneration: AiGeneration | null;
  // Version history
  versions: AiGeneration[];
  currentGenerationId: string | null;
  onSetCurrentGeneration: (generationId: string) => void;
  // Generation execution
  onRunGeneration: (serviceKey: string) => Promise<GenerationPreview>;
  onSaveGeneration?: (preview: GenerationPreview) => Promise<void>;
  // State
  selectedServices: Record<string, boolean>;
  onSelectedServicesChange: (services: Record<string, boolean>) => void;
  generatingServices: Record<string, boolean>;
  generationResults: Record<string, GenerationPreview | null>;
  savedGenerationIds: Record<string, string>;
  error: string | null;
  // Optional: version dropdown
  showVersionDropdown?: boolean;
  selectedVersionId?: string | null;
  onVersionSelect?: (versionId: string | null) => void;
}

export default function GenerationModal({
  isOpen,
  onClose,
  title,
  fileName,
  services,
  currentGeneration,
  versions,
  currentGenerationId,
  onSetCurrentGeneration,
  onRunGeneration,
  onSaveGeneration,
  selectedServices,
  onSelectedServicesChange,
  generatingServices,
  generationResults,
  savedGenerationIds,
  error,
  showVersionDropdown = false,
  selectedVersionId = null,
  onVersionSelect,
}: GenerationModalProps) {
  const [displayGeneration, setDisplayGeneration] = useState<AiGeneration | null>(currentGeneration);

  // Update display generation when current or selected version changes
  useEffect(() => {
    if (selectedVersionId) {
      const selected = versions.find(v => v.id === selectedVersionId);
      setDisplayGeneration(selected || null);
    } else {
      setDisplayGeneration(currentGeneration);
    }
  }, [currentGeneration, selectedVersionId, versions]);

  if (!isOpen) return null;

  const handleServiceChange = (serviceKey: string, checked: boolean) => {
    onSelectedServicesChange({
      ...selectedServices,
      [serviceKey]: checked,
    });
  };

  const handleRunAll = async () => {
    const selectedKeys = Object.entries(selectedServices)
      .filter(([_, selected]) => selected)
      .map(([key]) => key);

    for (const serviceKey of selectedKeys) {
      try {
        await onRunGeneration(serviceKey);
      } catch (err) {
        console.error(`Error running generation for ${serviceKey}:`, err);
      }
    }
  };

  const hasSelectedServices = Object.values(selectedServices).some(selected => selected);
  const isGenerating = Object.values(generatingServices).some(generating => generating);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {fileName}
              </p>
            </div>
            <Tooltip
              id="close-generation-modal"
              content="Close this <b>modal</b> dialog"
              html
            >
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Side - Current Generation */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold">Current Generation</h4>
                {versions.length > 0 && showVersionDropdown && onVersionSelect && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        // Toggle dropdown - this would need state management
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      View Versions
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <GenerationViewer
                generation={displayGeneration}
                maxHeight="60vh"
                showMetadata={true}
              />
            </div>

            {/* Right Side - New Generations */}
            <div className="flex flex-col">
              <h4 className="text-md font-semibold mb-4">New Generations</h4>
              
              {/* Service Selection */}
              <ServiceSelector
                services={services}
                selectedServices={selectedServices}
                onServiceChange={handleServiceChange}
                className="mb-4"
              />

              {/* Run Button */}
              <Tooltip
                id="run-all-generations"
                content="Generate with all <b>selected services</b>"
                html
              >
                <button
                  onClick={handleRunAll}
                  disabled={!hasSelectedServices || isGenerating}
                  className="mb-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Run ${title}`
                  )}
                </button>
              </Tooltip>

              {/* Results */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                {services.map((service) => {
                  if (!selectedServices[service.key]) return null;

                  const result = generationResults[service.key];
                  const isGenerating = generatingServices[service.key];
                  const savedId = savedGenerationIds[service.key];
                  const isCurrent = currentGenerationId === savedId;

                  return (
                    <div
                      key={service.key}
                      className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{service.label}</span>
                          {isGenerating && (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          )}
                        </div>
                        {result && savedId && (
                          result.saved ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Saved</span>
                            </div>
                          ) : (
                            <Tooltip
                              id={`save-generation-${service.key}`}
                              content="Save this <u>generation</u> to database"
                              html
                            >
                              <button
                                onClick={() => result && onSaveGeneration?.(result)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </Tooltip>
                          )
                        )}
                        {result && savedId && onSetCurrentGeneration && (
                          <Tooltip
                            id={`set-current-generation-${service.key}`}
                            content={isCurrent ? "This is the <b>current</b> generation" : "Set as <b>current</b> active generation"}
                            html
                          >
                            <button
                              onClick={() => onSetCurrentGeneration(savedId)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isCurrent}
                            >
                              {isCurrent ? 'Current' : 'Set as Current'}
                            </button>
                          </Tooltip>
                        )}
                      </div>
                      {result ? (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Version {result.version}
                          </div>
                          <MarkdownEditor
                            value={result.text}
                            readOnly={true}
                            maxHeight="40vh"
                            className="text-sm"
                          />
                          {result.metadata && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {Object.entries(result.metadata).map(([key, value]) => {
                                if (key === 'service' || value === null || value === undefined) return null;
                                if (typeof value === 'object') return null;
                                return (
                                  <span key={key}>
                                    {key}: {String(value)}
                                    {key !== Object.keys(result.metadata).slice(-1)[0] && ' • '}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : result === null ? (
                        <div className="text-sm text-red-600 dark:text-red-400">Generation failed</div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">No generation yet</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-100 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

