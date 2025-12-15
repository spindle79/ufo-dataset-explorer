'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'between';

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
  value2?: string; // For 'between' operator
}

interface UdbQueryBuilderProps {
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  onClose: () => void;
  availableFields: Array<{ key: string; label: string; type: 'text' | 'number' | 'date' }>;
}

export default function UdbQueryBuilder({
  filters,
  onFiltersChange,
  onClose,
  availableFields,
}: UdbQueryBuilderProps) {
  const [localFilters, setLocalFilters] = useState<FilterRule[]>(filters);

  const addFilter = () => {
    const newFilter: FilterRule = {
      id: Date.now().toString(),
      field: availableFields[0]?.key || '',
      operator: 'equals',
      value: '',
    };
    setLocalFilters([...localFilters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setLocalFilters(localFilters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterRule>) => {
    setLocalFilters(
      localFilters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const clearFilters = () => {
    setLocalFilters([]);
    onFiltersChange([]);
  };

  const getOperatorsForField = (fieldType: 'text' | 'number' | 'date'): FilterOperator[] => {
    switch (fieldType) {
      case 'number':
        return ['equals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between'];
      case 'text':
        return ['equals', 'contains'];
      case 'date':
        return ['equals', 'greaterThan', 'lessThan', 'between'];
      default:
        return ['equals', 'contains'];
    }
  };

  const getFieldType = (fieldKey: string): 'text' | 'number' | 'date' => {
    const field = availableFields.find((f) => f.key === fieldKey);
    return field?.type || 'text';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-[90vw] mx-4 max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
        <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Query Builder
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {localFilters.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No filters applied. Click "Add Filter" to get started.
            </div>
          ) : (
            localFilters.map((filter) => {
              const fieldType = getFieldType(filter.field);
              const operators = getOperatorsForField(fieldType);
              const isBetween = filter.operator === 'between';

              return (
                <div
                  key={filter.id}
                  className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <select
                    value={filter.field}
                    onChange={(e) =>
                      updateFilter(filter.id, {
                        field: e.target.value,
                        operator: 'equals',
                        value: '',
                        value2: undefined,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {availableFields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) =>
                      updateFilter(filter.id, {
                        operator: e.target.value as FilterOperator,
                        value2: undefined,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {operators.map((op) => (
                      <option key={op} value={op}>
                        {op === 'equals' && 'equals'}
                        {op === 'contains' && 'contains'}
                        {op === 'greaterThan' && 'greater than'}
                        {op === 'lessThan' && 'less than'}
                        {op === 'greaterThanOrEqual' && 'greater than or equal'}
                        {op === 'lessThanOrEqual' && 'less than or equal'}
                        {op === 'between' && 'between'}
                      </option>
                    ))}
                  </select>

                  <input
                    type={fieldType === 'number' ? 'number' : 'text'}
                    value={filter.value}
                    onChange={(e) =>
                      updateFilter(filter.id, { value: e.target.value })
                    }
                    placeholder="Value"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />

                  {isBetween && (
                    <input
                      type={fieldType === 'number' ? 'number' : 'text'}
                      value={filter.value2 || ''}
                      onChange={(e) =>
                        updateFilter(filter.id, { value2: e.target.value })
                      }
                      placeholder="To"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  )}

                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Remove
                  </button>
                </div>
              );
            })
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={addFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Add Filter
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear All
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

