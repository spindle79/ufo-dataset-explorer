import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { UdbParsed } from '@/lib/supabase-types';

/**
 * GET /api/udb/supabase
 *
 * Query UDB records from Supabase database
 *
 * Query Parameters:
 * - limit: Number of records to return (default: 50, max: 1000)
 * - offset: Number of records to skip (default: 0)
 * - search: Search term to filter by description/title (searches in raw_data)
 * - year: Filter by year
 * - month: Filter by month (1-12)
 * - day: Filter by day
 * - country: Filter by country
 * - stateOrProvince: Filter by state or province
 * - location: Filter by location
 * - minCredibility: Minimum credibility rating
 * - maxCredibility: Maximum credibility rating
 * - minStrangeness: Minimum strangeness rating
 * - maxStrangeness: Maximum strangeness rating
 * - sortBy: Field to sort by (default: 'udb_id')
 *   Supported: udb_id, year, month, day, country, stateOrProvince, location,
 *              title, credibility, strangeness, latitude, longitude, time, duration
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 *
 * Examples:
 * - GET /api/udb/supabase?limit=50&offset=0
 * - GET /api/udb/supabase?year=1972&country=United States
 * - GET /api/udb/supabase?search=triangle&minCredibility=6
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supabase = createAdminClient();

    // Parse query parameters
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      1000
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || null;
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : null;
    const month = searchParams.get('month')
      ? parseInt(searchParams.get('month')!, 10)
      : null;
    const day = searchParams.get('day')
      ? parseInt(searchParams.get('day')!, 10)
      : null;
    const country = searchParams.get('country') || null;
    const stateOrProvince = searchParams.get('stateOrProvince') || null;
    const location = searchParams.get('location') || null;
    const title = searchParams.get('title') || null;
    const time = searchParams.get('time') || null;
    const duration = searchParams.get('duration') || null;
    const locale = searchParams.get('locale') || null;
    const continent = searchParams.get('continent') || null;
    const elevation = searchParams.get('elevation') || null;
    const relativeAltitude = searchParams.get('relativeAltitude') || null;
    const locationFlags = searchParams.get('locationFlags') || null;
    const miscellaneousFlags = searchParams.get('miscellaneousFlags') || null;
    const typeOfUfoCraftFlags = searchParams.get('typeOfUfoCraftFlags') || null;
    const aliensMonstersFlags = searchParams.get('aliensMonstersFlags') || null;
    const apparentUfoOccupantActivitiesFlags = searchParams.get('apparentUfoOccupantActivitiesFlags') || null;
    const placesVisitedAndThingsAffectedFlags = searchParams.get('placesVisitedAndThingsAffectedFlags') || null;
    const evidenceAndSpecialEffectsFlags = searchParams.get('evidenceAndSpecialEffectsFlags') || null;
    const miscellaneousDetailsFlags = searchParams.get('miscellaneousDetailsFlags') || null;
    const ref = searchParams.get('ref') || null;
    const minCredibility = searchParams.get('minCredibility')
      ? parseInt(searchParams.get('minCredibility')!, 10)
      : null;
    const maxCredibility = searchParams.get('maxCredibility')
      ? parseInt(searchParams.get('maxCredibility')!, 10)
      : null;
    const minStrangeness = searchParams.get('minStrangeness')
      ? parseInt(searchParams.get('minStrangeness')!, 10)
      : null;
    const maxStrangeness = searchParams.get('maxStrangeness')
      ? parseInt(searchParams.get('maxStrangeness')!, 10)
      : null;
    const sortBy = searchParams.get('sortBy') || 'udb_id';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build query - use explicit columns for better performance
    let query = supabase.from('udb_parsed').select('*', { count: 'exact' });

    // Apply filters using explicit columns (much faster than JSONB queries)
    if (year !== null) {
      query = query.eq('udb_year', year);
    }
    if (month !== null) {
      query = query.eq('udb_month', month);
    }
    if (day !== null) {
      query = query.eq('udb_day', day);
    }
    if (country) {
      query = query.ilike('udb_country', `%${country}%`);
    }
    if (stateOrProvince) {
      query = query.ilike('udb_state_or_province', `%${stateOrProvince}%`);
    }
    if (location) {
      query = query.ilike('udb_location', `%${location}%`);
    }
    if (title) {
      query = query.ilike('udb_title', `%${title}%`);
    }
    if (time) {
      query = query.ilike('udb_time', `%${time}%`);
    }
    if (duration) {
      query = query.ilike('udb_duration', `%${duration}%`);
    }
    if (locale) {
      query = query.ilike('udb_locale', `%${locale}%`);
    }
    if (continent) {
      query = query.ilike('udb_continent', `%${continent}%`);
    }
    if (elevation) {
      query = query.ilike('udb_elevation', `%${elevation}%`);
    }
    if (relativeAltitude) {
      query = query.ilike('udb_relative_altitude', `%${relativeAltitude}%`);
    }
    if (locationFlags) {
      query = query.ilike('udb_location_flags', `%${locationFlags}%`);
    }
    if (miscellaneousFlags) {
      query = query.ilike('udb_miscellaneous_flags', `%${miscellaneousFlags}%`);
    }
    if (typeOfUfoCraftFlags) {
      query = query.ilike('udb_type_of_ufo_craft_flags', `%${typeOfUfoCraftFlags}%`);
    }
    if (aliensMonstersFlags) {
      query = query.ilike('udb_aliens_monsters_flags', `%${aliensMonstersFlags}%`);
    }
    if (apparentUfoOccupantActivitiesFlags) {
      query = query.ilike('udb_apparent_ufo_occupant_activities_flags', `%${apparentUfoOccupantActivitiesFlags}%`);
    }
    if (placesVisitedAndThingsAffectedFlags) {
      query = query.ilike('udb_places_visited_and_things_affected_flags', `%${placesVisitedAndThingsAffectedFlags}%`);
    }
    if (evidenceAndSpecialEffectsFlags) {
      query = query.ilike('udb_evidence_and_special_effects_flags', `%${evidenceAndSpecialEffectsFlags}%`);
    }
    if (miscellaneousDetailsFlags) {
      query = query.ilike('udb_miscellaneous_details_flags', `%${miscellaneousDetailsFlags}%`);
    }
    if (ref) {
      query = query.ilike('udb_ref', `%${ref}%`);
    }
    if (minCredibility !== null) {
      query = query.gte('udb_credibility', minCredibility);
    }
    if (maxCredibility !== null) {
      query = query.lte('udb_credibility', maxCredibility);
    }
    if (minStrangeness !== null) {
      query = query.gte('udb_strangeness', minStrangeness);
    }
    if (maxStrangeness !== null) {
      query = query.lte('udb_strangeness', maxStrangeness);
    }

    // Text search using full-text search on explicit columns
    if (search) {
      // Use full-text search on description (most common field)
      // Fallback to ilike if full-text search doesn't work as expected
      query = query.or(
        `udb_description.ilike.%${search}%,udb_title.ilike.%${search}%`
      );
    }

    // Map sortBy to database column names
    const sortColumnMap: Record<string, string> = {
      udb_id: 'udb_id',
      year: 'udb_year',
      month: 'udb_month',
      day: 'udb_day',
      country: 'udb_country',
      stateOrProvince: 'udb_state_or_province',
      location: 'udb_location',
      title: 'udb_title',
      credibility: 'udb_credibility',
      strangeness: 'udb_strangeness',
      latitude: 'udb_latitude',
      longitude: 'udb_longitude',
      time: 'udb_time',
      duration: 'udb_duration',
      continent: 'udb_continent',
      locale: 'udb_locale',
      elevation: 'udb_elevation',
      relativeAltitude: 'udb_relative_altitude',
    };

    const dbColumn = sortColumnMap[sortBy] || 'udb_id';

    // Apply sorting using explicit columns
    query = query.order(dbColumn, {
      ascending: sortOrder === 'asc',
      nullsFirst: false,
    });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error querying UDB from Supabase:', error);
      return NextResponse.json(
        {
          error: 'Database error',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in UDB Supabase API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Failed to query UDB database',
      },
      { status: 500 }
    );
  }
}


