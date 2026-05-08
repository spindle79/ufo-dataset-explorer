import { NextRequest, NextResponse } from 'next/server';
import { getMediaByDomain } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const decodedDomain = decodeURIComponent(domain);

    const documents = await getMediaByDomain(decodedDomain, 'pdf');

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching domain documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domain documents' },
      { status: 500 }
    );
  }
}

