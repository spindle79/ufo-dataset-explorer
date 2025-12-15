import { NextRequest, NextResponse } from 'next/server';
import { getScrapedPageHtml } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const html = await getScrapedPageHtml(id);
    
    if (!html) {
      return NextResponse.json(
        { error: 'HTML content not found' },
        { status: 404 }
      );
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error fetching scraped page HTML:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch HTML' },
      { status: 500 }
    );
  }
}

