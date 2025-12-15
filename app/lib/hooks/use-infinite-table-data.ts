'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { FilterRule } from '@/components/UdbQueryBuilder';

interface StoreState<TData> {
  data: TData[];
  count: number;
  isSuccess: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  hasInitialFetch: boolean;
}

type Listener = () => void;

interface FetchDataParams {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: FilterRule[];
}

interface FetchDataResponse<TData> {
  records: TData[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

type FetchDataFunction<TData> = (
  params: FetchDataParams
) => Promise<FetchDataResponse<TData>>;

function createStore<TData>(
  fetchData: FetchDataFunction<TData>,
  pageSize: number,
  defaultSortBy: string,
  defaultSortOrder: 'asc' | 'desc',
  filters: FilterRule[]
) {
  let state: StoreState<TData> = {
    data: [],
    count: 0,
    isSuccess: false,
    isLoading: false,
    isFetching: false,
    error: null,
    hasInitialFetch: false,
  };

  let currentSortBy = defaultSortBy;
  let currentSortOrder = defaultSortOrder;
  let currentFilters = filters;

  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const setState = (newState: Partial<StoreState<TData>>) => {
    state = { ...state, ...newState };
    notify();
  };

  const fetchPage = async (skip: number, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    // Don't fetch if already fetching or if we've loaded all data
    if (state.hasInitialFetch && (state.isFetching || state.count <= state.data.length)) {
      return;
    }

    // Update sort if provided
    if (sortBy !== undefined) currentSortBy = sortBy;
    if (sortOrder !== undefined) currentSortOrder = sortOrder;

    setState({ isFetching: true });

    try {
      const result = await fetchData({
        limit: pageSize,
        offset: skip,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
        filters: currentFilters,
      });

      setState({
        data: skip === 0 
          ? result.records 
          : [...state.data, ...result.records],
        count: result.pagination.total,
        isSuccess: true,
        error: null,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      console.error('Error fetching data:', error);
      setState({ error, isSuccess: false });
    } finally {
      setState({ isFetching: false });
    }
  };

  const fetchNextPage = async () => {
    if (state.isFetching) return;
    await fetchPage(state.data.length);
  };

  const refresh = async (newFilters?: FilterRule[], newSortBy?: string, newSortOrder?: 'asc' | 'desc') => {
    if (newFilters !== undefined) currentFilters = newFilters;
    if (newSortBy !== undefined) currentSortBy = newSortBy;
    if (newSortOrder !== undefined) currentSortOrder = newSortOrder;
    
    setState({ 
      isLoading: true, 
      isSuccess: false, 
      data: [],
      count: 0,
      hasInitialFetch: false,
    });
    await fetchPage(0, newSortBy, newSortOrder);
    setState({ isLoading: false, hasInitialFetch: true });
  };

  const initialize = async () => {
    setState({ isLoading: true, isSuccess: false, data: [] });
    await fetchPage(0);
    setState({ isLoading: false, hasInitialFetch: true });
  };

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    fetchNextPage,
    refresh,
    initialize,
  };
}

// Empty initial state to avoid hydration errors
const initialState: StoreState<any> = {
  data: [],
  count: 0,
  isSuccess: false,
  isLoading: false,
  isFetching: false,
  error: null,
  hasInitialFetch: false,
};

interface UseInfiniteTableDataProps<TData> {
  fetchData: FetchDataFunction<TData>;
  pageSize?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  filters?: FilterRule[];
  enabled?: boolean;
}

export function useInfiniteTableData<TData = any>({
  fetchData,
  pageSize = 50,
  defaultSortBy = 'id',
  defaultSortOrder = 'desc',
  filters = [],
  enabled = true,
}: UseInfiniteTableDataProps<TData>) {
  const storeRef = useRef(
    createStore(fetchData, pageSize, defaultSortBy, defaultSortOrder, filters)
  );

  const state = useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current.getState(),
    () => initialState as StoreState<TData>
  );

  useEffect(() => {
    // Recreate store if key props change
    if (
      storeRef.current.getState().hasInitialFetch &&
      (pageSize !== pageSize || defaultSortBy !== defaultSortBy)
    ) {
      storeRef.current = createStore(
        fetchData,
        pageSize,
        defaultSortBy,
        defaultSortOrder,
        filters
      );
    }

    if (!state.hasInitialFetch && enabled && typeof window !== 'undefined') {
      storeRef.current.initialize();
    }
  }, [pageSize, defaultSortBy, defaultSortOrder, enabled, state.hasInitialFetch]);

  // Refresh when filters change
  useEffect(() => {
    if (state.hasInitialFetch && enabled) {
      storeRef.current.refresh(filters);
    }
  }, [JSON.stringify(filters), enabled]);

  return {
    data: state.data,
    count: state.count,
    isSuccess: state.isSuccess,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    hasMore: state.count > state.data.length,
    fetchNextPage: storeRef.current.fetchNextPage,
    refresh: (newFilters?: FilterRule[], newSortBy?: string, newSortOrder?: 'asc' | 'desc') => {
      storeRef.current.refresh(newFilters, newSortBy, newSortOrder);
    },
  };
}

