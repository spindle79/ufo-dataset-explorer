import { NextRequest, NextResponse } from 'next/server';
import { getPagesByDomain } from '@/lib/scrape-access';
import { getMediaForScrapedPage } from '@/lib/scrape-media-relationships';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const decodedDomain = decodeURIComponent(domain);

    const pages = await getPagesByDomain(decodedDomain);

    // Get first image for each page
    const pagesWithImages = await Promise.all(
      pages.map(async (page) => {
        try {
          const media = await getMediaForScrapedPage(page.id);
          const firstImage = media.find((m) => m.type === "image");
          return {
            ...page,
            firstImageId: firstImage?.id || null,
          };
        } catch {
          return {
            ...page,
            firstImageId: null,
          };
        }
      })
    );

    return NextResponse.json(pagesWithImages);
  } catch (error) {
    console.error('Error fetching domain pages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domain pages' },
      { status: 500 }
    );
  }
}

