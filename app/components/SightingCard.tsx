'use client';

import { UFOSighting } from './DatasetExplorer';

interface SightingCardProps {
  sighting: UFOSighting;
}

export default function SightingCard({ sighting }: SightingCardProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatLocation = () => {
    const parts = [];
    if (sighting.city) parts.push(sighting.city);
    if (sighting.state) parts.push(sighting.state);
    if (sighting.country) parts.push(sighting.country);
    return parts.length > 0 ? parts.join(', ') : 'Unknown location';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {formatDate(sighting.t_utc)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatLocation()}
            </p>
          </div>
          {sighting.cluster_id !== undefined && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              Cluster {sighting.cluster_id}
            </span>
          )}
        </div>

        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
          {sighting.text || 'No description available'}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          {sighting.lat !== undefined && sighting.lon !== undefined && (
            <span>
              📍 {sighting.lat.toFixed(4)}, {sighting.lon.toFixed(4)}
            </span>
          )}
          {sighting.nearest_airport_code && (
            <span>
              ✈️ {sighting.nearest_airport_code}
              {sighting.nearest_airport_km !== undefined && (
                ` (${sighting.nearest_airport_km.toFixed(1)} km)`
              )}
            </span>
          )}
          {sighting.moon_illum !== undefined && (
            <span>
              🌙 Moon: {(sighting.moon_illum * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {sighting.src && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Source: {sighting.src}
          </p>
        )}
      </div>
    </div>
  );
}

