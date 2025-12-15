import { NextRequest, NextResponse } from 'next/server';
import { getAllScrapedPages } from '@/lib/scrape-access';

export async function GET(request: NextRequest) {
  try {
    const scrapedPages = await getAllScrapedPages();
    return NextResponse.json(scrapedPages);
  } catch (error) {
    console.error('Error fetching scraped pages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scraped pages' },
      { status: 500 }
    );
  }
}

