import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { UfoClusteredParsed } from '@/lib/supabase-types';

/**
 * GET /api/ufo-clustered
 *
 * Query UFO Clustered records from Supabase database
 *
 * Query Parameters:
 * - limit: Number of records to return (default: 50, max: 1000)
 * - offset: Number of records to skip (default: 0)
 * - search: Search term to filter by text (searches in ufo_text)
 * - country: Filter by country code
 * - state: Filter by state or province
 * - city: Filter by city
 * - src: Filter by source dataset
 * - clusterId: Filter by cluster ID
 * - wxBucket: Filter by weather bucket
 * - minProb: Minimum cluster probability
 * - maxProb: Maximum cluster probability
 * - sortBy: Field to sort by (default: 'ufo_t_utc')
 *   Supported: ufo_t_utc, ufo_city, ufo_state, ufo_country, ufo_src, ufo_cluster_id, ufo_prob
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 *
 * Examples:
 * - GET /api/ufo-clustered?limit=50&offset=0
 * - GET /api/ufo-clustered?country=US&state=ca
 * - GET /api/ufo-clustered?search=triangle&minProb=0.8
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
    const country = searchParams.get('country') || null;
    const state = searchParams.get('state') || null;
    const city = searchParams.get('city') || null;
    const src = searchParams.get('src') || null;
    const clusterId = searchParams.get('clusterId')
      ? parseInt(searchParams.get('clusterId')!, 10)
      : null;
    const wxBucket = searchParams.get('wxBucket') || null;
    const minProb = searchParams.get('minProb')
      ? parseFloat(searchParams.get('minProb')!)
      : null;
    const maxProb = searchParams.get('maxProb')
      ? parseFloat(searchParams.get('maxProb')!)
      : null;
    const sortBy = searchParams.get('sortBy') || 'ufo_t_utc';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build query - use explicit columns for better performance
    let query = supabase.from('ufo_clustered_parsed').select('*', { count: 'exact' });

    // Apply filters using explicit columns
    if (country) {
      query = query.ilike('ufo_country', `%${country}%`);
    }
    if (state) {
      query = query.ilike('ufo_state', `%${state}%`);
    }
    if (city) {
      query = query.ilike('ufo_city', `%${city}%`);
    }
    if (src) {
      query = query.ilike('ufo_src', `%${src}%`);
    }
    if (clusterId !== null) {
      query = query.eq('ufo_cluster_id', clusterId);
    }
    if (wxBucket) {
      query = query.ilike('ufo_wx_bucket', `%${wxBucket}%`);
    }
    if (minProb !== null) {
      query = query.gte('ufo_prob', minProb);
    }
    if (maxProb !== null) {
      query = query.lte('ufo_prob', maxProb);
    }

    // Text search using full-text search on text field
    if (search) {
      query = query.ilike('ufo_text', `%${search}%`);
    }

    // Map sortBy to database column names
    const sortColumnMap: Record<string, string> = {
      ufo_t_utc: 'ufo_t_utc',
      t_utc: 'ufo_t_utc',
      city: 'ufo_city',
      state: 'ufo_state',
      country: 'ufo_country',
      src: 'ufo_src',
      clusterId: 'ufo_cluster_id',
      cluster_id: 'ufo_cluster_id',
      prob: 'ufo_prob',
      probability: 'ufo_prob',
    };

    const dbColumn = sortColumnMap[sortBy] || 'ufo_t_utc';

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
      console.error('Error querying UFO Clustered from Supabase:', error);
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
    console.error('Error in UFO Clustered API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Failed to query UFO Clustered database',
      },
      { status: 500 }
    );
  }
}

