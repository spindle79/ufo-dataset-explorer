'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (key: string, value: string) => void;
  filters: {
    state: string;
    country: string;
    search: string;
  };
}

export default function SearchBar({ onSearch, onFilterChange, filters }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium mb-2">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sightings..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="state" className="block text-sm font-medium mb-2">
              State
            </label>
            <input
              type="text"
              id="state"
              value={filters.state}
              onChange={(e) => onFilterChange('state', e.target.value)}
              placeholder="e.g., CA"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-2">
              Country
            </label>
            <input
              type="text"
              id="country"
              value={filters.country}
              onChange={(e) => onFilterChange('country', e.target.value)}
              placeholder="e.g., US"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Search
        </button>
      </form>
    </div>
  );
}

