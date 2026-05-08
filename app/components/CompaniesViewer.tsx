"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ChevronUp,
  ChevronDown,
  Minus,
  Eye,
  Building2,
} from "lucide-react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  aliases: string[];
  created_at: string;
  updated_at: string;
}

type SortField = "name" | "created_at" | "updated_at";
type SortOrder = "asc" | "desc";

interface CompaniesViewerProps {
  filterIds?: string[];
}

export default function CompaniesViewer({
  filterIds,
}: CompaniesViewerProps = {}) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/entities/companies");
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const data = await response.json();
      // Filter by IDs if filterIds prop is provided
      let filtered = filterIds
        ? data.companies.filter((company: Company) => filterIds.includes(company.id))
        : data.companies;
      setCompanies(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load companies"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [filterIds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
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
          Loading companies...
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
          Companies ({companies.length})
        </h3>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No companies found.
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
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-2">
                    Created
                    <SortIcon field="created_at" />
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
              {sortedCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {Array.isArray(company.aliases) && company.aliases.length > 0
                      ? company.aliases.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(company.created_at)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm">
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => router.push(`/companies/${company.id}`)}
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

