import type { ColumnFiltersState } from '@tanstack/react-table';
import type { FilterRule } from '@/components/UdbQueryBuilder';
import type { ColumnDefinition } from '@/components/DataTable';

/**
 * Converts TanStack Table column filters to our FilterRule format
 * Supports text, number, and date filters
 */
export function convertTanStackFiltersToFilterRules(
  columnFilters: ColumnFiltersState,
  columns: ColumnDefinition[]
): FilterRule[] {
  if (!columnFilters || columnFilters.length === 0) return [];

  const rules: FilterRule[] = [];

  columnFilters.forEach((filter) => {
    const column = columns.find((col) => col.key === filter.id);
    if (!column) return;

    const filterValue = filter.value as string;
    if (!filterValue || filterValue.trim() === '') return;

    // For text columns, use contains operator
    if (column.type === 'text') {
      rules.push({
        id: `${filter.id}-contains-${Date.now()}`,
        field: filter.id,
        operator: 'contains',
        value: filterValue,
      });
    }
    // For number columns, try to parse and use equals
    // In a more sophisticated implementation, we could detect range operators
    else if (column.type === 'number') {
      const numValue = parseFloat(filterValue);
      if (!isNaN(numValue)) {
        rules.push({
          id: `${filter.id}-equals-${Date.now()}`,
          field: filter.id,
          operator: 'equals',
          value: filterValue,
        });
      }
    }
    // For date columns, use equals
    else if (column.type === 'date') {
      rules.push({
        id: `${filter.id}-equals-${Date.now()}`,
        field: filter.id,
        operator: 'equals',
        value: filterValue,
      });
    }
  });

  return rules;
}


