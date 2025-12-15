import type { ColumnDefinition, FilterConfig, DataTableConfig } from '@/components/DataTable';
import type { UfoClusteredParsed } from '@/lib/supabase-types';
import type { FilterRule } from '@/components/UdbQueryBuilder';

// UFO Clustered Column Definitions
export const ufoClusteredColumns: ColumnDefinition[] = [
  { key: 'uid', label: 'UID', sortable: true, type: 'text', defaultVisible: true },
  { key: 't_utc', label: 'Date/Time (UTC)', sortable: true, type: 'text', defaultVisible: true },
  { key: 'city', label: 'City', sortable: true, type: 'text', defaultVisible: true },
  { key: 'state', label: 'State', sortable: true, type: 'text', defaultVisible: true },
  { key: 'country', label: 'Country', sortable: true, type: 'text', defaultVisible: true },
  { key: 'text', label: 'Description', sortable: false, type: 'text', defaultVisible: true },
  { key: 'src', label: 'Source', sortable: true, type: 'text', defaultVisible: true },
  { key: 'cluster_id', label: 'Cluster ID', sortable: true, type: 'number', defaultVisible: true },
  { key: 'prob', label: 'Probability', sortable: true, type: 'number', defaultVisible: true },
  { key: 'lat', label: 'Latitude', sortable: true, type: 'number', defaultVisible: false },
  { key: 'lon', label: 'Longitude', sortable: true, type: 'number', defaultVisible: false },
  { key: 'moon_illum', label: 'Moon Illumination', sortable: true, type: 'number', defaultVisible: false },
  { key: 'moon_alt_deg', label: 'Moon Altitude', sortable: true, type: 'number', defaultVisible: false },
  { key: 'nearest_airport_code', label: 'Nearest Airport', sortable: true, type: 'text', defaultVisible: false },
  { key: 'nearest_airport_km', label: 'Airport Distance (km)', sortable: true, type: 'number', defaultVisible: false },
  { key: 'wx_bucket', label: 'Weather', sortable: true, type: 'text', defaultVisible: false },
];

// UFO Clustered Filter Configuration
export const ufoClusteredFilterConfig: FilterConfig = {
  fieldMapping: {
    city: 'city',
    state: 'state',
    country: 'country',
    src: 'src',
    wxBucket: 'wxBucket',
    clusterId: 'clusterId',
  },
  specialFields: {
    prob: {
      minParam: 'minProb',
      maxParam: 'maxProb',
    },
  },
};

// Format cell value for UFO Clustered records
export function formatUfoClusteredCellValue(record: UfoClusteredParsed, columnKey: string): string {
  switch (columnKey) {
    case 'uid':
      return record.uid || '';
    case 't_utc':
      return record.ufo_t_utc ? new Date(record.ufo_t_utc).toLocaleString() : '';
    case 'city':
      return record.ufo_city || '';
    case 'state':
      return record.ufo_state || '';
    case 'country':
      return record.ufo_country || '';
    case 'text':
      return record.ufo_text || '';
    case 'src':
      return record.ufo_src || '';
    case 'cluster_id':
      return record.ufo_cluster_id?.toString() || '';
    case 'prob':
      return record.ufo_prob?.toFixed(3) || '';
    case 'lat':
      return record.ufo_lat?.toFixed(6) || '';
    case 'lon':
      return record.ufo_lon?.toFixed(6) || '';
    case 'moon_illum':
      return record.ufo_moon_illum?.toFixed(3) || '';
    case 'moon_alt_deg':
      return record.ufo_moon_alt_deg?.toFixed(2) || '';
    case 'nearest_airport_code':
      return record.ufo_nearest_airport_code || '';
    case 'nearest_airport_km':
      return record.ufo_nearest_airport_km?.toFixed(2) || '';
    case 'wx_bucket':
      return record.ufo_wx_bucket || '';
    default:
      return '';
  }
}

// Build API params from filters
export function buildUfoClusteredApiParams(
  filters: FilterRule[],
  limit: number,
  offset: number,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): URLSearchParams {
  // Map sortBy to API parameter name
  const sortByMap: Record<string, string> = {
    t_utc: 'ufo_t_utc',
    city: 'city',
    state: 'state',
    country: 'country',
    src: 'src',
    cluster_id: 'clusterId',
    clusterId: 'clusterId',
    prob: 'prob',
    probability: 'prob',
  };
  
  const apiSortBy = sortByMap[sortBy] || sortBy;
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sortBy: apiSortBy,
    sortOrder,
  });

  filters.forEach((filter) => {
    const fieldMapping = ufoClusteredFilterConfig.fieldMapping;
    const specialFields = ufoClusteredFilterConfig.specialFields;
    const apiKey = fieldMapping[filter.field] || filter.field;
    const specialField = specialFields?.[filter.field];

    if (filter.operator === 'equals' || filter.operator === 'contains') {
      params.append(apiKey, filter.value);
    } else if (filter.operator === 'greaterThan' || filter.operator === 'greaterThanOrEqual') {
      if (specialField?.minParam) {
        params.append(specialField.minParam, filter.value);
      } else {
        params.append(`min${apiKey.charAt(0).toUpperCase() + apiKey.slice(1)}`, filter.value);
      }
    } else if (filter.operator === 'lessThan' || filter.operator === 'lessThanOrEqual') {
      if (specialField?.maxParam) {
        params.append(specialField.maxParam, filter.value);
      } else {
        params.append(`max${apiKey.charAt(0).toUpperCase() + apiKey.slice(1)}`, filter.value);
      }
    } else if (filter.operator === 'between') {
      if (specialField?.minParam) {
        params.append(specialField.minParam, filter.value);
        if (filter.value2 && specialField.maxParam) {
          params.append(specialField.maxParam, filter.value2);
        }
      } else {
        params.append(`min${apiKey.charAt(0).toUpperCase() + apiKey.slice(1)}`, filter.value);
        if (filter.value2) {
          params.append(`max${apiKey.charAt(0).toUpperCase() + apiKey.slice(1)}`, filter.value2);
        }
      }
    }
  });

  return params;
}

export interface UfoClusteredResponse {
  records: UfoClusteredParsed[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Fetch function for UFO Clustered data
export async function fetchUfoClusteredData(params: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: FilterRule[];
}): Promise<UfoClusteredResponse> {
  const apiParams = buildUfoClusteredApiParams(
    params.filters,
    params.limit,
    params.offset,
    params.sortBy,
    params.sortOrder
  );

  const response = await fetch(`/api/ufo-clustered?${apiParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch UFO Clustered records');
  }

  return await response.json();
}

// Get UFO Clustered table configuration
export function getUfoClusteredTableConfig(initialLimit = 50): DataTableConfig<UfoClusteredParsed> {
  return {
    columns: ufoClusteredColumns,
    filterConfig: ufoClusteredFilterConfig,
    fetchData: fetchUfoClusteredData,
    getRecordId: (record) => record.id,
    formatCellValue: formatUfoClusteredCellValue,
    initialLimit,
    defaultSortBy: 't_utc',
    defaultSortOrder: 'desc',
    enableFilters: true,
    enableColumnVisibility: true,
    enableTextSize: true,
    enableDensity: true,
  };
}

