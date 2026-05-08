"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Locations } from "../../lib/supabase-types";
import {
  Loader2,
  ChevronUp,
  ChevronDown,
  Minus,
  Eye,
  MapPin,
} from "lucide-react";
import Link from "next/link";

type SortField = "name" | "city" | "state" | "country" | "created_at" | "updated_at";
type SortOrder = "asc" | "desc";

interface LocationsViewerProps {
  filterIds?: string[];
}

export default function LocationsViewer({
  filterIds,
}: LocationsViewerProps = {}) {
  const router = useRouter();
  const [locations, setLocations] = useState<Locations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/entities/locations");
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      const data = await response.json();
      // Filter by IDs if filterIds prop is provided
      let filtered = filterIds
        ? data.locations.filter((location: Locations) => filterIds.includes(location.id))
        : data.locations;
      setLocations(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load locations"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [filterIds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedLocations = [...locations].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case "city":
        aVal = (a.city || "").toLowerCase();
        bVal = (b.city || "").toLowerCase();
        break;
      case "state":
        aVal = (a.state || "").toLowerCase();
        bVal = (b.state || "").toLowerCase();
        break;
      case "country":
        aVal = (a.country || "").toLowerCase();
        bVal = (b.country || "").toLowerCase();
        break;
      case "created_at":
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case "updated_at":
        aVal = new Date(a.updated_at).getTime();
        bVal = new Date(b.updated_at).getTime();
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <Minus className="w-4 h-4 text-gray-400" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Loading locations...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Locations ({locations.length})
        </h3>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No locations found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Name
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Aliases
                </th>
                <th
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("city")}
                >
                  <div className="flex items-center gap-2">
                    City
                    <SortIcon field="city" />
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("state")}
                >
                  <div className="flex items-center gap-2">
                    State
                    <SortIcon field="state" />
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort("country")}
                >
                  <div className="flex items-center gap-2">
                    Country
                    <SortIcon field="country" />
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedLocations.map((location) => (
                <tr
                  key={location.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <Link
                      href={`/locations/${location.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                    >
                      {location.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {Array.isArray(location.aliases) && location.aliases.length > 0
                      ? location.aliases.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {location.city || "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {location.state || "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {location.country || "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm">
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => router.push(`/locations/${location.id}`)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

