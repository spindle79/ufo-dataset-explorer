'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridOptions, IGetRowsParams, IFilterModel } from 'ag-grid-community';
import { 
  InfiniteRowModelModule,
  ModuleRegistry,
  DateFilterModule,
  TextFilterModule,
  NumberFilterModule,
  ColumnApiModule,
  ValidationModule,
  themeQuartz,
} from 'ag-grid-community';
import { convertAgGridFiltersToFilterRules } from '@/lib/ag-grid-filter-converter';
import type { FilterRule } from './UdbQueryBuilder';
// AG Grid CSS is imported in layout.tsx to ensure proper load order and prevent Tailwind overrides

// Register required modules for infinite row model with filters and floating filters
ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  ColumnApiModule,
  ValidationModule,
]);

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

  const gridRef = useRef<AgGridReact<T>>(null);
  const datasourceRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Convert columns to ag-grid column definitions
  const columnDefs = useMemo<ColDef<T>[]>(() => {
    return columns.map((col) => {
      const baseColDef: ColDef<T> = {
        field: col.key,
        headerName: col.label,
        sortable: col.sortable,
        hide: col.defaultVisible === false,
        filter: col.type === 'number' ? 'agNumberColumnFilter' : 
                col.type === 'date' ? 'agDateColumnFilter' : 
                'agTextColumnFilter',
        floatingFilter: true,
      };

      if (col.renderCell) {
        baseColDef.cellRenderer = (params: any) => {
          if (!params.data) return '';
          const value = formatCellValue(params.data, col.key);
          return col.renderCell!(value, params.data);
        };
      } else {
        baseColDef.cellRenderer = (params: any) => {
          if (!params.data) return '';
          const value = formatCellValue(params.data, col.key);
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

      return baseColDef;
    });
  }, [columns, formatCellValue]);

  // Data source for infinite row model
  // According to AG Grid docs: https://www.ag-grid.com/javascript-data-grid/infinite-scrolling/
  const datasource = useMemo(() => {
    return {
      getRows: async (params: IGetRowsParams) => {
        try {
          setIsLoading(true);
          setError(null);
          
          const sortModel = params.sortModel[0];
          const sortBy = sortModel?.colId || defaultSortBy || columns[0]?.key || '';
          const sortOrder = sortModel?.sort === 'asc' ? 'asc' : 'desc';

          // Convert AG Grid filter model to FilterRule format
          const filterRules = convertAgGridFiltersToFilterRules(params.filterModel);

          // Calculate block size from requested range
          const blockSize = params.endRow - params.startRow;
          const limit = blockSize > 0 ? blockSize : initialLimit;

          const data = await fetchData({
            limit,
            offset: params.startRow,
            sortBy,
            sortOrder,
            filters: filterRules,
          });

          setTotalRows(data.pagination.total);
          setIsLoading(false);
          
          // Call successCallback with the data and total row count
          params.successCallback(data.records, data.pagination.total);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          setIsLoading(false);
          params.failCallback();
        }
      },
    };
  }, [fetchData, initialLimit, defaultSortBy, columns]);

  // Update datasource ref when it changes
  useEffect(() => {
    datasourceRef.current = datasource;
    // Update datasource on grid API if grid is already ready
    if (gridRef.current?.api) {
      gridRef.current.api.setGridOption('datasource', datasource);
    }
  }, [datasource]);

  // Grid options
  const gridOptions = useMemo<GridOptions<T>>(() => {
    return {
      theme: themeQuartz,
      defaultColDef: {
        resizable: true,
        filter: true,
        floatingFilter: true,
      },
      // Note: Sidebar with filters panel requires enterprise features
      // For community edition, we'll use column filters and floating filters
      // Users can access filters via column menu
      onGridReady: (params) => {
        // Set the datasource on the grid API for infinite row model
        if (datasourceRef.current) {
          params.api.setGridOption('datasource', datasourceRef.current);
        }
        
        // Set initial sort
        if (defaultSortBy) {
          params.api.applyColumnState({
            state: [
              {
                colId: defaultSortBy,
                sort: defaultSortOrder,
              },
            ],
            defaultState: { sort: null },
          });
        }
      },
    };
  }, [defaultSortBy, defaultSortOrder]);

  // Note: Filter changes are handled automatically by AG Grid's infinite row model
  // The datasource will be called with the new filterModel when filters change

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

      {/* AG Grid */}
      <div style={{ height: '600px', width: '100%' }}>
        <AgGridReact<T>
          ref={gridRef}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          rowModelType="infinite"
          cacheBlockSize={initialLimit}
          maxBlocksInCache={10}
          infiniteInitialRowCount={initialLimit}
          rowBuffer={10}
          animateRows={true}
        />
      </div>

    </div>
  );
}

