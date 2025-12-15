'use client';

import type { UdbParsed } from '@/lib/supabase-types';

interface UdbRecordCardProps {
  record: UdbParsed;
}

export default function UdbRecordCard({ record }: UdbRecordCardProps) {
  // Use explicit columns first, fallback to raw_data for additional fields
  const rawData = record.raw_data as any;

  const formatDate = () => {
    const year = record.udb_year ?? rawData?.year;
    const month = record.udb_month ?? rawData?.month;
    const day = record.udb_day ?? rawData?.day;
    const time = record.udb_time ?? rawData?.time;

    if (!year) return 'Unknown date';

    const dateParts = [];
    if (month) dateParts.push(month);
    if (day) dateParts.push(day);
    dateParts.push(year);

    let dateStr = dateParts.join('/');
    if (time) {
      dateStr += ` ${time}`;
    }

    return dateStr;
  };

  const formatLocation = () => {
    const parts = [];
    if (record.udb_location) parts.push(record.udb_location);
    else if (rawData?.location) parts.push(rawData.location);
    
    if (record.udb_state_or_province) parts.push(record.udb_state_or_province);
    else if (rawData?.stateOrProvince) parts.push(rawData.stateOrProvince);
    
    if (record.udb_country) parts.push(record.udb_country);
    else if (rawData?.country) parts.push(rawData.country);
    
    return parts.length > 0 ? parts.join(', ') : 'Unknown location';
  };

  const getDescription = () => {
    return (
      record.udb_description ||
      record.udb_title ||
      rawData?.description ||
      rawData?.title ||
      rawData?.text ||
      'No description available'
    );
  };

  const getTitle = () => {
    return record.udb_title || rawData?.title || `UDB Record #${record.udb_id}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {getTitle()}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatLocation()}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              ID: {record.udb_id}
            </span>
            {(record.udb_credibility !== null && record.udb_credibility !== undefined) && (
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                Credibility: {record.udb_credibility}
              </span>
            )}
            {(record.udb_strangeness !== null && record.udb_strangeness !== undefined) && (
              <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                Strangeness: {record.udb_strangeness}
              </span>
            )}
          </div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
          {getDescription()}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          {(record.udb_latitude !== null && record.udb_longitude !== null) && (
            <span>
              📍 {record.udb_latitude.toFixed(4)}, {record.udb_longitude.toFixed(4)}
            </span>
          )}
          {record.udb_duration && (
            <span>⏱️ Duration: {record.udb_duration}</span>
          )}
          {record.udb_time && <span>🕐 Time: {record.udb_time}</span>}
        </div>

        {rawData.references && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            References: {rawData.references}
          </p>
        )}
      </div>
    </div>
  );
}

