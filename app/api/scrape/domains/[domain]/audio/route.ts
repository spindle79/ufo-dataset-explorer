import { NextRequest, NextResponse } from 'next/server';
import { getMediaByDomain } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const decodedDomain = decodeURIComponent(domain);

    const audio = await getMediaByDomain(decodedDomain, 'audio');

    return NextResponse.json(audio);
  } catch (error) {
    console.error('Error fetching domain audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domain audio' },
      { status: 500 }
    );
  }
}

