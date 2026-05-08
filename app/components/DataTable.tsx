'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { convertTanStackFiltersToFilterRules } from '@/lib/tanstack-filter-converter';
import type { FilterRule } from './UdbQueryBuilder';

export interface ColumnDefinition {
  key: string;
  label: string;
  sortable: boolean;
  type: 'text' | 'number' | 'date';
  defaultVisible?: boolean;
  renderCell?: (value: any, record: any) => React.ReactNode;
}

export interface FilterFieldMapping {
  [fieldKey: string]: string; // Maps component field keys to API parameter names
  // Special handling for min/max prefixes can be configured
}

export interface FilterConfig {
  fieldMapping: FilterFieldMapping;
  specialFields?: {
    // Fields that need special API parameter names (e.g., credibility -> minCredibility)
    [fieldKey: string]: {
      minParam?: string;
      maxParam?: string;
    };
  };
}

export interface DataTableConfig<T = any> {
  columns: ColumnDefinition[];
  filterConfig?: FilterConfig;
  fetchData: (params: {
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    filters: FilterRule[];
  }) => Promise<{
    records: T[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>;
  getRecordId: (record: T) => string | number;
  formatCellValue: (record: T, columnKey: string) => string;
  initialLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  enableFilters?: boolean;
}

interface DataTableProps<T = any> {
  config: DataTableConfig<T>;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function DataTable<T = any>({ config }: DataTableProps<T>) {
  const {
    columns,
    filterConfig,
    fetchData,
    getRecordId,
    formatCellValue,
    initialLimit = 50,
    defaultSortBy,
    defaultSortOrder = 'desc',
    enableFilters = true,
  } = config;

  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (defaultSortBy) {
      return [{ id: defaultSortBy, desc: defaultSortOrder === 'desc' }];
    }
    return [];
  });

  // Debounce filters
  const debouncedFilters = useDebounce(columnFilters, 300);

  // Convert TanStack column filters to FilterRule format
  const filterRules = useMemo(() => {
    return convertTanStackFiltersToFilterRules(debouncedFilters, columns);
  }, [debouncedFilters, columns]);

  // Create query key for React Query
  const queryKey = useMemo(() => {
    const sortBy = sorting[0]?.id || defaultSortBy || columns[0]?.key || '';
    const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';
    return [
      'dataTable',
      JSON.stringify({
        sortBy,
        sortOrder,
        filters: filterRules,
      }),
    ];
  }, [sorting, filterRules, defaultSortBy, columns]);

  // Infinite query for server-side data
  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      try {
        setError(null);
        const sortBy = sorting[0]?.id || defaultSortBy || columns[0]?.key || '';
        const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';

        const data = await fetchData({
          limit: initialLimit,
          offset: pageParam as number,
          sortBy,
          sortOrder,
          filters: filterRules,
        });

        return {
          records: data.records,
          total: data.pagination.total,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        throw err;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.records.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const tableData = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap((page) => page.records) || [];
  }, [infiniteQuery.data]);

  // Get total rows count
  const totalRows = useMemo(() => {
    return infiniteQuery.data?.pages[0]?.total || 0;
  }, [infiniteQuery.data]);

  // Convert columns to TanStack column definitions
  const tanStackColumns = useMemo<ColumnDef<T>[]>(() => {
    return columns.map((col) => {
      const baseCol: ColumnDef<T, unknown> = {
        id: col.key,
        header: col.label,
        enableSorting: col.sortable,
        size: 150,
        minSize: 50,
        maxSize: 800,
        accessorFn: (row: T) => {
          return formatCellValue(row, col.key);
        },
      };

      // Custom cell renderer
      if (col.renderCell) {
        baseCol.cell = ({ row }) => {
          const value = formatCellValue(row.original, col.key);
          return col.renderCell!(value, row.original);
        };
      } else {
        baseCol.cell = ({ row }) => {
          const value = formatCellValue(row.original, col.key);
          if (col.key === 'description') {
            return (
              <div className="max-w-xs truncate" title={value}>
                {value || <span className="text-gray-400 italic">No description</span>}
              </div>
            );
          }
          return value || <span className="text-gray-400">—</span>;
        };
      }

      // Enable filtering based on column type
      if (enableFilters) {
        baseCol.enableColumnFilter = true;
        baseCol.filterFn = (row, columnId, filterValue: string) => {
          if (!filterValue) return true;
          const value = formatCellValue(row.original, columnId);
          return String(value || '').toLowerCase().includes(filterValue.toLowerCase());
        };
      }

      return baseCol;
    });
  }, [columns, formatCellValue, enableFilters]);

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns: tanStackColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    manualSorting: true, // Server handles sorting
    manualFiltering: true, // Server handles filtering
    getRowId: (row: T) => String(getRecordId(row)),
  });

  // Virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  // Handle infinite scroll
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    const loadedCount = rows.length;
    const threshold = loadedCount * 0.8;

    if (
      lastItem.index >= threshold &&
      infiniteQuery.hasNextPage &&
      !infiniteQuery.isFetchingNextPage
    ) {
      infiniteQuery.fetchNextPage();
    }
  }, [rowVirtualizer, rows.length, infiniteQuery]);

  const isLoading = infiniteQuery.isLoading;
  const isFetchingNextPage = infiniteQuery.isFetchingNextPage;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {totalRows > 0 && (
            <>
              Total: {totalRows} records
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="h-[600px] overflow-auto border border-gray-200 dark:border-gray-700 rounded"
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                        {enableFilters && header.column.getCanFilter() && (
                          <input
                            type="text"
                            value={(header.column.getFilterValue() as string) || ''}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            placeholder="Filter..."
                            className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {isFetchingNextPage && (
          <div className="px-4 py-2 text-center text-sm text-gray-500">
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}
