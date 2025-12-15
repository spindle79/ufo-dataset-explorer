import type { FilterRule } from '@/components/UdbQueryBuilder';
import type { IFilterModel } from 'ag-grid-community';

/**
 * Converts AG Grid filter model to our FilterRule format
 * Supports text, number, and date filters
 */
export function convertAgGridFiltersToFilterRules(
  filterModel: IFilterModel | null | undefined
): FilterRule[] {
  if (!filterModel) return [];

  const rules: FilterRule[] = [];

  Object.keys(filterModel).forEach((field) => {
    const filter = filterModel[field];
    if (!filter) return;

    // Text filter
    if (filter.filterType === 'text') {
      if (filter.type === 'equals') {
        rules.push({
          id: `${field}-equals-${Date.now()}`,
          field,
          operator: 'equals',
          value: filter.filter || '',
        });
      } else if (filter.type === 'contains') {
        rules.push({
          id: `${field}-contains-${Date.now()}`,
          field,
          operator: 'contains',
          value: filter.filter || '',
        });
      } else if (filter.type === 'notContains') {
        // Not directly supported, skip for now
      } else if (filter.type === 'startsWith') {
        // Map to contains with wildcard
        rules.push({
          id: `${field}-contains-${Date.now()}`,
          field,
          operator: 'contains',
          value: filter.filter || '',
        });
      } else if (filter.type === 'endsWith') {
        // Map to contains with wildcard
        rules.push({
          id: `${field}-contains-${Date.now()}`,
          field,
          operator: 'contains',
          value: filter.filter || '',
        });
      }
    }
    // Number filter
    else if (filter.filterType === 'number') {
      if (filter.type === 'equals') {
        rules.push({
          id: `${field}-equals-${Date.now()}`,
          field,
          operator: 'equals',
          value: filter.filter?.toString() || '',
        });
      } else if (filter.type === 'greaterThan') {
        rules.push({
          id: `${field}-gt-${Date.now()}`,
          field,
          operator: 'greaterThan',
          value: filter.filter?.toString() || '',
        });
      } else if (filter.type === 'greaterThanOrEqual') {
        rules.push({
          id: `${field}-gte-${Date.now()}`,
          field,
          operator: 'greaterThanOrEqual',
          value: filter.filter?.toString() || '',
        });
      } else if (filter.type === 'lessThan') {
        rules.push({
          id: `${field}-lt-${Date.now()}`,
          field,
          operator: 'lessThan',
          value: filter.filter?.toString() || '',
        });
      } else if (filter.type === 'lessThanOrEqual') {
        rules.push({
          id: `${field}-lte-${Date.now()}`,
          field,
          operator: 'lessThanOrEqual',
          value: filter.filter?.toString() || '',
        });
      } else if (filter.type === 'inRange') {
        rules.push({
          id: `${field}-between-${Date.now()}`,
          field,
          operator: 'between',
          value: filter.filter?.toString() || '',
          value2: filter.filterTo?.toString() || '',
        });
      }
    }
    // Date filter
    else if (filter.filterType === 'date') {
      if (filter.type === 'equals') {
        rules.push({
          id: `${field}-equals-${Date.now()}`,
          field,
          operator: 'equals',
          value: filter.dateFrom || '',
        });
      } else if (filter.type === 'greaterThan') {
        rules.push({
          id: `${field}-gt-${Date.now()}`,
          field,
          operator: 'greaterThan',
          value: filter.dateFrom || '',
        });
      } else if (filter.type === 'lessThan') {
        rules.push({
          id: `${field}-lt-${Date.now()}`,
          field,
          operator: 'lessThan',
          value: filter.dateTo || '',
        });
      } else if (filter.type === 'inRange') {
        rules.push({
          id: `${field}-between-${Date.now()}`,
          field,
          operator: 'between',
          value: filter.dateFrom || '',
          value2: filter.dateTo || '',
        });
      }
    }
    // Set filter (for multi-select)
    else if (filter.filterType === 'set') {
      if (filter.values && filter.values.length > 0) {
        // For set filters, we'll use equals for the first value
        // In a more sophisticated implementation, we'd handle multiple values
        rules.push({
          id: `${field}-equals-${Date.now()}`,
          field,
          operator: 'equals',
          value: filter.values[0] || '',
        });
      }
    }
  });

  return rules;
}

