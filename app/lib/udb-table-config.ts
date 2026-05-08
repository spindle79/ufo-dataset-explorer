import type { ColumnDefinition, FilterConfig, DataTableConfig } from '@/components/DataTable';
import type { UdbParsed } from '@/lib/supabase-types';
import type { FilterRule } from '@/components/UdbQueryBuilder';

// UDB Column Definitions
export const udbColumns: ColumnDefinition[] = [
  { key: 'udb_id', label: 'ID', sortable: true, type: 'number', defaultVisible: true },
  { key: 'year', label: 'Year', sortable: true, type: 'number', defaultVisible: true },
  { key: 'month', label: 'Month', sortable: true, type: 'number', defaultVisible: true },
  { key: 'day', label: 'Day', sortable: true, type: 'number', defaultVisible: true },
  { key: 'time', label: 'Time', sortable: true, type: 'text', defaultVisible: true },
  { key: 'location', label: 'Location', sortable: true, type: 'text', defaultVisible: true },
  { key: 'stateOrProvince', label: 'State/Province', sortable: true, type: 'text', defaultVisible: true },
  { key: 'country', label: 'Country', sortable: true, type: 'text', defaultVisible: true },
  { key: 'continent', label: 'Continent', sortable: true, type: 'text', defaultVisible: false },
  { key: 'title', label: 'Title', sortable: true, type: 'text', defaultVisible: true },
  { key: 'description', label: 'Description', sortable: false, type: 'text', defaultVisible: true },
  { key: 'latitude', label: 'Latitude', sortable: true, type: 'number', defaultVisible: false },
  { key: 'longitude', label: 'Longitude', sortable: true, type: 'number', defaultVisible: false },
  { key: 'elevation', label: 'Elevation', sortable: false, type: 'text', defaultVisible: false },
  { key: 'relativeAltitude', label: 'Relative Altitude', sortable: false, type: 'text', defaultVisible: false },
  { key: 'credibility', label: 'Credibility', sortable: true, type: 'number', defaultVisible: true },
  { key: 'strangeness', label: 'Strangeness', sortable: true, type: 'number', defaultVisible: true },
  { key: 'duration', label: 'Duration', sortable: true, type: 'text', defaultVisible: false },
  { key: 'locale', label: 'Locale', sortable: false, type: 'text', defaultVisible: false },
  { key: 'locationFlags', label: 'Location Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'miscellaneousFlags', label: 'Misc Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'typeOfUfoCraftFlags', label: 'UFO Craft Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'aliensMonstersFlags', label: 'Aliens/Monsters Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'apparentUfoOccupantActivitiesFlags', label: 'Occupant Activities Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'placesVisitedAndThingsAffectedFlags', label: 'Places Visited Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'evidenceAndSpecialEffectsFlags', label: 'Evidence Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'miscellaneousDetailsFlags', label: 'Misc Details Flags', sortable: false, type: 'text', defaultVisible: false },
  { key: 'ref', label: 'Reference', sortable: false, type: 'text', defaultVisible: false },
];

// UDB Filter Configuration
export const udbFilterConfig: FilterConfig = {
  fieldMapping: {
    year: 'year',
    month: 'month',
    day: 'day',
    time: 'time',
    location: 'location',
    stateOrProvince: 'stateOrProvince',
    country: 'country',
    continent: 'continent',
    title: 'title',
    duration: 'duration',
    locale: 'locale',
    elevation: 'elevation',
    relativeAltitude: 'relativeAltitude',
    locationFlags: 'locationFlags',
    miscellaneousFlags: 'miscellaneousFlags',
    typeOfUfoCraftFlags: 'typeOfUfoCraftFlags',
    aliensMonstersFlags: 'aliensMonstersFlags',
    apparentUfoOccupantActivitiesFlags: 'apparentUfoOccupantActivitiesFlags',
    placesVisitedAndThingsAffectedFlags: 'placesVisitedAndThingsAffectedFlags',
    evidenceAndSpecialEffectsFlags: 'evidenceAndSpecialEffectsFlags',
    miscellaneousDetailsFlags: 'miscellaneousDetailsFlags',
    ref: 'ref',
  },
  specialFields: {
    credibility: {
      minParam: 'minCredibility',
      maxParam: 'maxCredibility',
    },
    strangeness: {
      minParam: 'minStrangeness',
      maxParam: 'maxStrangeness',
    },
  },
};

// Format cell value for UDB records
export function formatUdbCellValue(record: UdbParsed, columnKey: string): string {
  switch (columnKey) {
    case 'udb_id':
      return record.udb_id?.toString() || '';
    case 'year':
      return record.udb_year?.toString() || '';
    case 'month':
      return record.udb_month?.toString() || '';
    case 'day':
      return record.udb_day?.toString() || '';
    case 'time':
      return record.udb_time || '';
    case 'location':
      return record.udb_location || '';
    case 'stateOrProvince':
      return record.udb_state_or_province || '';
    case 'country':
      return record.udb_country || '';
    case 'continent':
      return record.udb_continent || '';
    case 'title':
      return record.udb_title || '';
    case 'description':
      return record.udb_description || '';
    case 'latitude':
      return record.udb_latitude?.toFixed(4) || '';
    case 'longitude':
      return record.udb_longitude?.toFixed(4) || '';
    case 'elevation':
      return record.udb_elevation || '';
    case 'relativeAltitude':
      return record.udb_relative_altitude || '';
    case 'credibility':
      return record.udb_credibility?.toString() || '';
    case 'strangeness':
      return record.udb_strangeness?.toString() || '';
    case 'duration':
      return record.udb_duration || '';
    case 'locale':
      return record.udb_locale || '';
    case 'locationFlags':
      return record.udb_location_flags || '';
    case 'miscellaneousFlags':
      return record.udb_miscellaneous_flags || '';
    case 'typeOfUfoCraftFlags':
      return record.udb_type_of_ufo_craft_flags || '';
    case 'aliensMonstersFlags':
      return record.udb_aliens_monsters_flags || '';
    case 'apparentUfoOccupantActivitiesFlags':
      return record.udb_apparent_ufo_occupant_activities_flags || '';
    case 'placesVisitedAndThingsAffectedFlags':
      return record.udb_places_visited_and_things_affected_flags || '';
    case 'evidenceAndSpecialEffectsFlags':
      return record.udb_evidence_and_special_effects_flags || '';
    case 'miscellaneousDetailsFlags':
      return record.udb_miscellaneous_details_flags || '';
    case 'ref':
      return record.udb_ref || '';
    default:
      return '';
  }
}

// Build API params from filters
export function buildUdbApiParams(
  filters: FilterRule[],
  limit: number,
  offset: number,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): URLSearchParams {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sortBy,
    sortOrder,
  });

  filters.forEach((filter) => {
    const fieldMapping = udbFilterConfig.fieldMapping;
    const specialFields = udbFilterConfig.specialFields;
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

export interface UdbResponse {
  records: UdbParsed[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Fetch function for UDB data
export async function fetchUdbData(params: {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: FilterRule[];
}): Promise<UdbResponse> {
  const apiParams = buildUdbApiParams(
    params.filters,
    params.limit,
    params.offset,
    params.sortBy,
    params.sortOrder
  );

  const response = await fetch(`/api/udb/supabase?${apiParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch UDB records');
  }

  return await response.json();
}

// Get UDB table configuration
export function getUdbTableConfig(initialLimit = 50): DataTableConfig<UdbParsed> {
  return {
    columns: udbColumns,
    filterConfig: udbFilterConfig,
    fetchData: fetchUdbData,
    getRecordId: (record) => record.id,
    formatCellValue: formatUdbCellValue,
    initialLimit,
    defaultSortBy: 'udb_id',
    defaultSortOrder: 'desc',
    enableFilters: true,
  };
}

