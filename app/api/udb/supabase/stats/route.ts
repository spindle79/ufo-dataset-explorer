import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/udb/supabase/stats
 *
 * Get statistics about UDB records in Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('udb_parsed')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get year range using explicit columns (much faster)
    const { data: yearData, error: yearError } = await supabase
      .from('udb_parsed')
      .select('udb_year')
      .not('udb_year', 'is', null)
      .order('udb_year', { ascending: true })
      .limit(1);

    const { data: yearDataDesc, error: yearErrorDesc } = await supabase
      .from('udb_parsed')
      .select('udb_year')
      .not('udb_year', 'is', null)
      .order('udb_year', { ascending: false })
      .limit(1);

    const minYear = yearData && yearData[0] ? yearData[0].udb_year : null;
    const maxYear = yearDataDesc && yearDataDesc[0] ? yearDataDesc[0].udb_year : null;

    return NextResponse.json({
      total: totalCount || 0,
      yearRange: {
        min: minYear,
        max: maxYear,
      },
    });
  } catch (error) {
    console.error('Error in UDB Supabase stats API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Failed to get stats',
      },
      { status: 500 }
    );
  }
}

