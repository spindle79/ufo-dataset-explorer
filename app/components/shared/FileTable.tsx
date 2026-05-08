"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type Column,
  type Row,
  type SortingState,
  type ColumnSizingState,
  type VisibilityState,
  type ColumnOrderState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BaseFile } from "@/lib/file-base";
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Filter,
  Trash2,
  Plus,
  Ban,
  CheckCircle,
} from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";

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

// Cell renderer params adapter to match AG Grid's ICellRendererParams
export interface CellRendererParams<T extends BaseFile> {
  data: T;
  value: any;
  rowIndex: number;
  colKey: string;
  column: Column<T, unknown>;
  row: Row<T>;
  colDef: FileTableColumn<T>;
}

export interface FileTableColumn<T extends BaseFile> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number;
  cellRenderer?: (params: CellRendererParams<T>) => React.ReactNode;
}

export interface BulkActions<T extends BaseFile> {
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkProcess?: (ids: string[]) => Promise<void>;
  onBulkExclude?: (ids: string[]) => Promise<void>;
  onBulkInclude?: (ids: string[]) => Promise<void>;
  // Custom bulk actions
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (ids: string[], files: T[]) => Promise<void>;
    variant?: "default" | "danger" | "secondary";
  }>;
}

export interface FileTableConfig<T extends BaseFile> {
  columns: FileTableColumn<T>[];
  fetchData: () => Promise<T[]>;
  getRecordId: (record: T) => string;
  initialLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  showExcluded?: boolean;
  filterIds?: string[];
  renderExpandedContent?: (file: T) => React.ReactNode;
  viewMode?: "condensed" | "normal" | "expanded";
  // Optional server-side pagination
  fetchPage?: (args: {
    offset: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, string>;
  }) => Promise<{ rows: T[]; total: number }>;
  // Bulk selection and actions
  enableBulkSelection?: boolean;
  bulkActions?: BulkActions<T>;
}

interface FileTableProps<T extends BaseFile> {
  config: FileTableConfig<T>;
  className?: string;
}

// Custom sort functions matching current AG Grid behavior
const getSortFunction = (key: string) => {
  switch (key) {
    case "fileName":
      return (a: BaseFile, b: BaseFile) => {
        const aVal = a.fileName.toLowerCase();
        const bVal = b.fileName.toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      };
    case "uploadedDate":
      return (a: BaseFile, b: BaseFile) => {
        const aVal = new Date(a.uploadedDate).getTime();
        const bVal = new Date(b.uploadedDate).getTime();
        return aVal - bVal;
      };
    case "description":
      return (a: BaseFile, b: BaseFile) => {
        const aVal = (a.description || "").toLowerCase();
        const bVal = (b.description || "").toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      };
    default:
      return undefined;
  }
};

// Create cell renderer adapter
function createCellRenderer<T extends BaseFile>(
  renderer: (params: CellRendererParams<T>) => React.ReactNode,
  colDef: FileTableColumn<T>
) {
  return (info: {
    row: Row<T>;
    column: Column<T, unknown>;
    getValue: () => any;
  }) => {
    const params: CellRendererParams<T> = {
      data: info.row.original,
      value: info.getValue(),
      rowIndex: info.row.index,
      colKey: info.column.id,
      column: info.column,
      row: info.row,
      colDef: colDef,
    };
    return renderer(params);
  };
}

// Sortable header component for drag-and-drop
function SortableHeader<T extends BaseFile>({
  column,
  colDef,
  onSort,
  sortState,
  onResize,
  showFilter,
  filterValue,
  onFilterChange,
  viewMode,
}: {
  column: Column<T, unknown>;
  colDef: FileTableColumn<T>;
  onSort: () => void;
  sortState: "asc" | "desc" | false;
  onResize: (size: number) => void;
  showFilter: boolean;
  filterValue: string;
  onFilterChange: (value: string) => void;
  viewMode: "condensed" | "normal" | "expanded";
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = column.getSize();

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, Math.min(800, startWidth + diff));
        onResize(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [column, onResize]
  );

  const columnSize = column.getSize();
  
  return (
    <th
      ref={setNodeRef}
      className="relative bg-[#1f2836] text-gray-400 text-xs font-medium uppercase tracking-wider border-b border-gray-700 select-none"
      style={{
        width: `${columnSize}px`,
        minWidth: `${columnSize}px`,
        maxWidth: `${columnSize}px`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {/* Drag handle - positioned absolutely so it doesn't affect width */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-700 rounded z-10 flex items-center"
        style={{ width: "20px", pointerEvents: "auto" }}
      >
        <GripVertical className="w-3 h-3 text-gray-500" />
      </div>

      {/* Header content */}
      <div className="flex items-center h-full px-2" style={{ marginLeft: "20px" }}>
        <button
          onClick={onSort}
          className="flex items-center gap-1 hover:text-white transition-colors"
          disabled={!colDef.sortable}
        >
          <span>{colDef.label}</span>
          {colDef.sortable && (
            <span className="text-gray-500">
              {sortState === "asc" && <ChevronUp className="w-3 h-3" />}
              {sortState === "desc" && <ChevronDown className="w-3 h-3" />}
              {!sortState && <span className="w-3 h-3 inline-block" />}
            </span>
          )}
        </button>

        {/* Resize handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 ${
            isResizing ? "bg-blue-500" : ""
          }`}
        />
      </div>

      {/* Filter input */}
      {showFilter && (
        <div className="absolute top-full left-0 right-0 bg-[#1f2836] border-b border-gray-700 p-1 z-10">
          <input
            type="text"
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter..."
            className="w-full px-2 py-1 text-sm bg-[#111827] text-white border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </th>
  );
}

export default function FileTable<T extends BaseFile>({
  config,
  className = "",
}: FileTableProps<T>) {
  const {
    columns: columnDefs,
    fetchData,
    fetchPage,
    getRecordId,
    initialLimit = 50,
    defaultSortBy,
    defaultSortOrder = "desc",
    showExcluded = false,
    filterIds,
    viewMode = "normal",
    enableBulkSelection = false,
    bulkActions,
  } = config;

  // Table state
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (defaultSortBy) {
      return [{ id: defaultSortBy, desc: defaultSortOrder === "desc" }];
    }
    return [];
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
    const sizing: ColumnSizingState = {};
    columnDefs.forEach((col) => {
      // Always set a width - use explicit width or default to 150
      sizing[col.key] = col.width || 150;
    });
    return sizing;
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    const order = columnDefs.map((col) => col.key);
    // If bulk selection is enabled, ensure checkbox column is first
    if (enableBulkSelection) {
      return ["__select", ...order];
    }
    return order;
  });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<{
    type: "delete" | "process" | "exclude" | "include";
    count: number;
  } | null>(null);

  // Debounce filter updates
  const debouncedFilters = useDebounce(columnFilters, 300);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Determine if using server-side pagination
  const isServerMode = !!fetchPage;

  // Create stable query key for React Query
  const queryKey = useMemo(() => {
    const sortBy = sorting[0]?.id;
    const sortOrder = sorting[0]?.desc ? "desc" : "asc";
    return [
      "fileTable",
      JSON.stringify({
        sortBy,
        sortOrder,
        filters: debouncedFilters,
        showExcluded,
        filterIds,
      }),
    ];
  }, [sorting, debouncedFilters, showExcluded, filterIds]);

  // Server-side data fetching with React Query
  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!fetchPage) throw new Error("fetchPage not provided");
      const sortBy = sorting[0]?.id;
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      return fetchPage({
        offset: pageParam,
        limit: initialLimit,
        sortBy,
        sortOrder,
        filters: debouncedFilters,
      });
    },
    getNextPageParam: (
      lastPage: { rows: T[]; total: number },
      allPages: { rows: T[]; total: number }[]
    ) => {
      const loaded = allPages.reduce(
        (sum: number, page: { rows: T[]; total: number }) =>
          sum + page.rows.length,
        0
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: isServerMode,
    initialPageParam: 0,
  });

  // Client-side data fetching with React Query
  const clientQuery = useQuery({
    queryKey: ["fileTable", "client", showExcluded, filterIds],
    queryFn: fetchData,
    enabled: !isServerMode,
  });

  // Process and filter client-side data
  const processedClientData = useMemo(() => {
    if (isServerMode || !clientQuery.data) return [];

    let data = [...clientQuery.data];

    // Filter by IDs if provided
    if (filterIds) {
      data = data.filter((file) => filterIds.includes(getRecordId(file)));
    }

    // Filter out excluded files unless showExcluded is true
    if (!showExcluded) {
      data = data.filter((file) => !(file as any).metadata?.excluded);
    }

    // Apply column filters
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (!value) return;
      data = data.filter((file) => {
        const fileValue = (file as any)[key];
        if (key === "fileName" || key === "description") {
          return String(fileValue || "")
            .toLowerCase()
            .includes(value.toLowerCase());
        }
        if (key === "uploadedDate") {
          return String(fileValue || "").includes(value);
        }
        return String(fileValue || "").includes(value);
      });
    });

    return data;
  }, [
    clientQuery.data,
    filterIds,
    showExcluded,
    debouncedFilters,
    isServerMode,
    getRecordId,
  ]);

  // Get table data (server or client)
  const tableData = useMemo(() => {
    if (isServerMode) {
      return (
        infiniteQuery.data?.pages.flatMap(
          (page: { rows: T[]; total: number }) => page.rows
        ) || []
      );
    }
    return processedClientData;
  }, [isServerMode, infiniteQuery.data, processedClientData]);

  // Get total rows count
  const totalRows = useMemo(() => {
    if (isServerMode) {
      return infiniteQuery.data?.pages[0]?.total || 0;
    }
    return processedClientData.length;
  }, [isServerMode, infiniteQuery.data, processedClientData.length]);

  // Bulk action handlers - show confirmation first
  const handleBulkDeleteClick = () => {
    if (!bulkActions?.onBulkDelete || selectedIds.size === 0) return;
    setConfirmBulkAction({ type: "delete", count: selectedIds.size });
  };

  const handleBulkProcessClick = () => {
    if (!bulkActions?.onBulkProcess || selectedIds.size === 0) return;
    setConfirmBulkAction({ type: "process", count: selectedIds.size });
  };

  const handleBulkExcludeClick = () => {
    if (!bulkActions?.onBulkExclude || selectedIds.size === 0) return;
    setConfirmBulkAction({ type: "exclude", count: selectedIds.size });
  };

  const handleBulkIncludeClick = () => {
    if (!bulkActions?.onBulkInclude || selectedIds.size === 0) return;
    setConfirmBulkAction({ type: "include", count: selectedIds.size });
  };

  // Actual bulk operations (called after confirmation)
  const handleBulkDelete = async () => {
    if (!bulkActions?.onBulkDelete || selectedIds.size === 0) return;
    setConfirmBulkAction(null);
    setIsBulkOperating(true);
    try {
      await bulkActions.onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkProcess = async () => {
    if (!bulkActions?.onBulkProcess || selectedIds.size === 0) return;
    setConfirmBulkAction(null);
    setIsBulkOperating(true);
    try {
      await bulkActions.onBulkProcess(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk process failed:", error);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkExclude = async () => {
    if (!bulkActions?.onBulkExclude || selectedIds.size === 0) return;
    setConfirmBulkAction(null);
    setIsBulkOperating(true);
    try {
      await bulkActions.onBulkExclude(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk exclude failed:", error);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkInclude = async () => {
    if (!bulkActions?.onBulkInclude || selectedIds.size === 0) return;
    setConfirmBulkAction(null);
    setIsBulkOperating(true);
    try {
      await bulkActions.onBulkInclude(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk include failed:", error);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(tableData.map((file) => getRecordId(file)));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Convert FileTableColumn to TanStack ColumnDef
  const tanStackColumns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    // Add checkbox column if bulk selection is enabled
    if (enableBulkSelection) {
      cols.push({
        id: "__select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={
              tableData.length > 0 &&
              tableData.every((file) =>
                selectedIds.has(getRecordId(file))
              )
            }
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
          />
        ),
        cell: ({ row }) => {
          const id = getRecordId(row.original);
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(id)}
              onChange={(e) => handleSelectRow(id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
          );
        },
        size: 50,
        enableSorting: false,
      });
    }

    return cols.concat(
      columnDefs.map((colDef) => {
      const baseCol: ColumnDef<T, unknown> = {
        id: colDef.key,
        header: colDef.label,
        enableSorting: colDef.sortable !== false,
        size: colDef.width || 150, // Use explicit width or default to 150
        minSize: 50,
        maxSize: 800,
      };

      // Set accessor for data fields
      if (
        colDef.key === "fileName" ||
        colDef.key === "uploadedDate" ||
        colDef.key === "description"
      ) {
        (baseCol as any).accessorKey = colDef.key;
      } else {
        (baseCol as any).accessorFn = () => null;
      }

        // Custom cell renderer
        if (colDef.cellRenderer) {
          baseCol.cell = createCellRenderer(colDef.cellRenderer, colDef);
        }

        // Custom sorting
        const sortFn = getSortFunction(colDef.key);
        if (sortFn) {
          baseCol.sortingFn = (rowA: Row<T>, rowB: Row<T>, columnId: string) => {
            const a = rowA.original;
            const b = rowB.original;
            return sortFn(a, b);
          };
        }

        return baseCol;
      })
    );
  }, [columnDefs, enableBulkSelection, selectedIds, tableData, getRecordId]);

  // Reorder columns based on columnOrder state
  // Ensure checkbox column is always first if bulk selection is enabled
  const orderedColumns = useMemo(() => {
    const columnMap = new Map(tanStackColumns.map((col) => [col.id!, col]));
    let ordered = columnOrder
      .map((id: string) => columnMap.get(id))
      .filter(
        (col: ColumnDef<T> | undefined): col is ColumnDef<T> =>
          col !== undefined
      )
      .concat(
        tanStackColumns.filter(
          (col: ColumnDef<T>) => !columnOrder.includes(col.id!)
        )
      );
    
    // If bulk selection is enabled, ensure checkbox column is first
    if (enableBulkSelection) {
      const checkboxCol = ordered.find((col) => col.id === "__select");
      const otherCols = ordered.filter((col) => col.id !== "__select");
      if (checkboxCol) {
        ordered = [checkboxCol, ...otherCols];
      }
    }
    
    return ordered;
  }, [tanStackColumns, columnOrder, enableBulkSelection]);

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns: orderedColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnSizing,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    manualSorting: isServerMode, // Server handles sorting in server mode
    getRowId: (row: T) => getRecordId(row),
  });

  // Virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => {
      switch (viewMode) {
        case "condensed":
          return 30;
        case "normal":
        case "expanded":
        default:
          return 50; // Increased to accommodate images
      }
    },
    overscan: 10,
  });

  // Handle infinite scroll (server mode)
  useEffect(() => {
    if (!isServerMode) return;

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
  }, [rowVirtualizer, rows.length, isServerMode, infiniteQuery]);

  // Handle column drag end
  // Note: In v10, collision detection strategies return arrays internally,
  // but `over` in DragEndEvent is still a single identifier, so this remains compatible
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((order: ColumnOrderState) => {
        const oldIndex = order.indexOf(String(active.id));
        const newIndex = order.indexOf(String(over.id));
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(order, oldIndex, newIndex);
        }
        return order;
      });
    }
  };

  // Loading state
  const isLoading = isServerMode
    ? infiniteQuery.isLoading
    : clientQuery.isLoading;
  const isFetchingNextPage = infiniteQuery.isFetchingNextPage;
  const error = isServerMode ? infiniteQuery.error : clientQuery.error;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Loading files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error instanceof Error ? error.message : "An error occurred"}
      </div>
    );
  }

  const rowHeight = viewMode === "condensed" ? 30 : 50;
  const paddingY = viewMode === "condensed" ? "py-1" : "py-2";
  const paddingX = viewMode === "condensed" ? "px-2" : "px-4";

  return (
    <div className={`w-full ${className}`}>
      {/* Styles for image constraints in table cells */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .file-table-container td img,
          .file-table-container td [class*="thumbnail"],
          .file-table-container td [class*="image"] {
            max-height: ${rowHeight}px;
            max-width: 100%;
            object-fit: contain;
            display: block;
          }
          .file-table-container table {
            table-layout: fixed;
            width: 100%;
          }
          .file-table-container td {
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            position: relative;
          }
          .file-table-container td > div {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            max-width: 100%;
            max-height: 100%;
            box-sizing: border-box;
          }
          /* File name column - ensure text uses ellipsis */
          .file-table-container td[data-column="fileName"] {
            overflow: hidden !important;
          }
          .file-table-container td[data-column="fileName"] > div {
            min-width: 0; /* Allow flex items to shrink */
            max-width: 100%;
            overflow: hidden !important;
          }
          .file-table-container td[data-column="fileName"] > div > span {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            min-width: 0; /* Allow flex items to shrink */
            flex: 1 1 0;
            max-width: 100%;
            display: block;
          }
          /* Ensure images don't break layout */
          .file-table-container td img {
            flex-shrink: 0;
          }
          /* Allow specific cells to wrap if needed (like description) */
          .file-table-container td[data-wrap="true"] {
            white-space: normal;
          }
          .file-table-container td[data-wrap="true"] > div {
            white-space: normal;
          }
        `,
        }}
      />
      {/* Bulk Selection Toolbar */}
      {enableBulkSelection && (
        <div className={`mb-2 p-3 border rounded flex items-center justify-between ${
          selectedIds.size > 0 
            ? "bg-blue-900/20 border-blue-700" 
            : "bg-gray-900/20 border-gray-700"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`text-sm ${
              selectedIds.size > 0 ? "text-blue-300" : "text-gray-400"
            }`}>
              {selectedIds.size > 0 
                ? `${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} selected`
                : "No items selected"
              }
            </div>
            <button
              onClick={() => handleSelectAll(true)}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-1"
            >
              Select All
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleSelectAll(false)}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-1"
              >
                Deselect All
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            {bulkActions?.onBulkProcess && (
              <button
                onClick={handleBulkProcessClick}
                disabled={isBulkOperating}
                className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Process
              </button>
            )}
            {bulkActions?.onBulkExclude && (
              <button
                onClick={handleBulkExcludeClick}
                disabled={isBulkOperating}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="w-4 h-4" />
                Exclude
              </button>
            )}
            {bulkActions?.onBulkInclude && (
              <button
                onClick={handleBulkIncludeClick}
                disabled={isBulkOperating}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                Include
              </button>
            )}
            {bulkActions?.onBulkDelete && (
              <button
                onClick={handleBulkDeleteClick}
                disabled={isBulkOperating}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            {bulkActions?.customActions?.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const selectedFiles = tableData.filter((file) =>
                    selectedIds.has(getRecordId(file))
                  );
                  action.onClick(Array.from(selectedIds), selectedFiles);
                }}
                disabled={isBulkOperating}
                className={`px-3 py-1 text-sm text-white rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : action.variant === "secondary"
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
          )}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-400">
          Showing {rows.length} of {totalRows} rows
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 text-sm bg-[#1f2836] text-gray-400 hover:text-white border border-gray-700 rounded flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="px-3 py-1 text-sm bg-[#1f2836] text-gray-400 hover:text-white border border-gray-700 rounded flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Columns
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 mt-1 bg-[#1f2836] border border-gray-700 rounded shadow-lg z-20 min-w-[200px]">
                <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400">
                    Column Visibility
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const allVisible: VisibilityState = {};
                        columnDefs.forEach((col) => {
                          allVisible[col.key] = true;
                        });
                        setColumnVisibility(allVisible);
                      }}
                      className="text-xs px-2 py-1 text-blue-400 hover:text-blue-300"
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => {
                        const allHidden: VisibilityState = {};
                        columnDefs.forEach((col) => {
                          allHidden[col.key] = false;
                        });
                        setColumnVisibility(allHidden);
                      }}
                      className="text-xs px-2 py-1 text-blue-400 hover:text-blue-300"
                    >
                      Hide All
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {columnDefs.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={
                          table.getColumn(col.key)?.getIsVisible() ?? true
                        }
                        onChange={(e) => {
                          table
                            .getColumn(col.key)
                            ?.toggleVisibility(e.target.checked);
                        }}
                        className="rounded border-gray-600 bg-[#111827] text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table container */}
      <div
        ref={tableContainerRef}
        className="file-table-container border border-gray-700 rounded overflow-auto bg-[#111827]"
        style={{ height: "600px" }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table
            className="border-collapse"
            style={{ 
              tableLayout: "fixed", 
              width: "100%",
              borderSpacing: 0,
            }}
            cellPadding="0"
            cellSpacing="0"
          >
            <colgroup>
              {table.getHeaderGroups()[0]?.headers.map((header: any) => {
                const colDef = columnDefs.find((col) => col.key === header.column.id);
                // Use explicit width from config, or default to 150
                const colWidth = colDef?.width || 150;
                return (
                  <col
                    key={header.id}
                    style={{ width: `${colWidth}px` }}
                  />
                );
              })}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <SortableContext
                items={columnOrder}
                strategy={horizontalListSortingStrategy}
              >
                <tr>
                  {table.getHeaderGroups()[0]?.headers.map((header: any) => {
                    const colDef = columnDefs.find(
                      (col) => col.key === header.column.id
                    );
                    if (!colDef) return null;
                    const sortState = header.column.getIsSorted();
                    return (
                      <SortableHeader
                        key={header.id}
                        column={header.column}
                        colDef={colDef}
                        onSort={() => {
                          // Cycle: none -> asc -> desc -> none
                          if (sortState === false) {
                            header.column.toggleSorting(false); // asc
                          } else if (sortState === "asc") {
                            header.column.toggleSorting(true); // desc
                          } else {
                            header.column.clearSorting(); // none
                          }
                        }}
                        sortState={
                          sortState === false
                            ? false
                            : sortState === "asc"
                            ? "asc"
                            : "desc"
                        }
                        onResize={(size) => {
                          header.column.setSize(size);
                        }}
                        showFilter={showFilters}
                        filterValue={columnFilters[header.column.id] || ""}
                        onFilterChange={(value) => {
                          setColumnFilters((prev) => ({
                            ...prev,
                            [header.column.id]: value,
                          }));
                        }}
                        viewMode={viewMode}
                      />
                    );
                  })}
                </tr>
              </SortableContext>
            </thead>
            <tbody
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="text-center py-8 text-gray-400"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;

                  const isExcluded = (row.original as any)?.metadata?.excluded;

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-700 hover:bg-[#1f2836] transition-colors ${
                        isExcluded ? "opacity-50" : ""
                      }`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        maxHeight: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        display: "table-row",
                      }}
                    >
                      {row.getVisibleCells().map((cell: any) => {
                        // Allow description column to wrap if it exists
                        const allowWrap = cell.column.id === "description";
                        const columnSize = cell.column.getSize();
                        return (
                          <td
                            key={cell.id}
                            className={`${paddingX} ${paddingY} text-sm text-white overflow-hidden`}
                            data-column={cell.column.id}
                            data-wrap={allowWrap ? "true" : "false"}
                            style={{
                              width: `${columnSize}px !important`,
                              minWidth: `${columnSize}px`,
                              maxWidth: `${columnSize}px`,
                              maxHeight: `${virtualRow.size}px`,
                              height: `${virtualRow.size}px`,
                              verticalAlign: "middle",
                              overflow: "hidden",
                              boxSizing: "border-box",
                            }}
                          >
                            <div className="h-full flex items-center overflow-hidden w-full max-w-full">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DndContext>

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Loading more...
          </div>
        )}
      </div>

      {/* Bulk Operation Confirmation Modals */}
      {enableBulkSelection && confirmBulkAction && (
        <>
          {confirmBulkAction.type === "delete" && (
            <ConfirmationModal
              isOpen={true}
              onClose={() => setConfirmBulkAction(null)}
              onConfirm={handleBulkDelete}
              title="Confirm Bulk Delete"
              message={`Are you sure you want to delete ${confirmBulkAction.count} item${confirmBulkAction.count !== 1 ? "s" : ""}? This action cannot be undone.`}
              confirmLabel="Delete"
              confirmVariant="danger"
              loading={isBulkOperating}
              loadingLabel="Deleting..."
            />
          )}
          {confirmBulkAction.type === "process" && (
            <ConfirmationModal
              isOpen={true}
              onClose={() => setConfirmBulkAction(null)}
              onConfirm={handleBulkProcess}
              title="Confirm Bulk Process"
              message={`Are you sure you want to process ${confirmBulkAction.count} item${confirmBulkAction.count !== 1 ? "s" : ""}? This will download and process the files from their source URLs.`}
              confirmLabel="Process"
              confirmVariant="primary"
              loading={isBulkOperating}
              loadingLabel="Processing..."
            />
          )}
          {confirmBulkAction.type === "exclude" && (
            <ConfirmationModal
              isOpen={true}
              onClose={() => setConfirmBulkAction(null)}
              onConfirm={handleBulkExclude}
              title="Confirm Bulk Exclude"
              message={`Are you sure you want to exclude ${confirmBulkAction.count} item${confirmBulkAction.count !== 1 ? "s" : ""} from the table view?`}
              confirmLabel="Exclude"
              confirmVariant="danger"
              loading={isBulkOperating}
              loadingLabel="Excluding..."
            />
          )}
          {confirmBulkAction.type === "include" && (
            <ConfirmationModal
              isOpen={true}
              onClose={() => setConfirmBulkAction(null)}
              onConfirm={handleBulkInclude}
              title="Confirm Bulk Include"
              message={`Are you sure you want to include ${confirmBulkAction.count} item${confirmBulkAction.count !== 1 ? "s" : ""} in the table view?`}
              confirmLabel="Include"
              confirmVariant="success"
              loading={isBulkOperating}
              loadingLabel="Including..."
            />
          )}
        </>
      )}
    </div>
  );
}
