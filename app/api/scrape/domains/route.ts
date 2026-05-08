import { NextRequest, NextResponse } from 'next/server';
import { getDomainsWithCounts } from '@/lib/scrape-access';

export async function GET(request: NextRequest) {
  try {
    const domains = await getDomainsWithCounts();
    return NextResponse.json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

