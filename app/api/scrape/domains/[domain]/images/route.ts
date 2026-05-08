import { NextRequest, NextResponse } from 'next/server';
import { getMediaByDomain } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const decodedDomain = decodeURIComponent(domain);

    const images = await getMediaByDomain(decodedDomain, 'image');

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching domain images:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domain images' },
      { status: 500 }
    );
  }
}

