import { NextRequest, NextResponse } from 'next/server';
import { getMediaByDomain } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const decodedDomain = decodeURIComponent(domain);

    const video = await getMediaByDomain(decodedDomain, 'video');

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error fetching domain video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domain video' },
      { status: 500 }
    );
  }
}

