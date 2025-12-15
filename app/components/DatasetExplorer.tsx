'use client';

import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import SightingCard from './SightingCard';

export interface UFOSighting {
  uid: string;
  t_utc: string;
  lat: number;
  lon: number;
  text: string;
  src: string;
  city?: string;
  state?: string;
  country?: string;
  cluster_id?: number;
  prob?: number;
  moon_illum?: number;
  moon_alt_deg?: number;
  nearest_airport_km?: number;
  nearest_airport_code?: string;
  wx_bucket?: string;
  reports_z?: number | null;
}

export interface DatasetResponse {
  data: UFOSighting[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export default function DatasetExplorer() {
  const [sightings, setSightings] = useState<UFOSighting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState({
    state: '',
    country: '',
    search: '',
  });

  const fetchSightings = async (resetOffset = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: resetOffset ? '0' : pagination.offset.toString(),
      });

      if (filters.state) params.append('state', filters.state);
      if (filters.country) params.append('country', filters.country);
      if (filters.search) params.append('search', filters.search);
      params.append('sortBy', 't_utc');
      params.append('sortOrder', 'desc');

      const response = await fetch(`/api/dataset?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sightings');
      }

      const data: DatasetResponse = await response.json();
      setSightings(data.data);
      setPagination({
        ...pagination,
        offset: resetOffset ? 0 : pagination.offset,
        total: data.pagination.total,
        hasMore: data.pagination.hasMore,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSightings(true);
  }, [filters]);

  const handleSearch = (searchTerm: string) => {
    setFilters({ ...filters, search: searchTerm });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination({ ...pagination, offset: pagination.offset + pagination.limit });
      fetchSightings();
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) });
      fetchSightings();
    }
  };

  return (
    <div className="space-y-6">
      <SearchBar
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading sightings...</p>
        </div>
      )}

      {!loading && sightings.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No sightings found.</p>
        </div>
      )}

      {!loading && sightings.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sightings.map((sighting) => (
              <SightingCard key={sighting.uid} sighting={sighting} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} sightings
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

