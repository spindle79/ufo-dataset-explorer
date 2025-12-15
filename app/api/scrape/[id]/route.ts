import { NextRequest, NextResponse } from 'next/server';
import { getScrapedPageById, updateScrapedPage, deleteScrapedPage } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scrapedPage = await getScrapedPageById(id);
    
    if (!scrapedPage) {
      return NextResponse.json(
        { error: 'Scraped page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(scrapedPage);
  } catch (error) {
    console.error('Error fetching scraped page:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scraped page' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updated = await updateScrapedPage(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Scraped page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating scraped page:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update scraped page' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteScrapedPage(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Scraped page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scraped page:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete scraped page' },
      { status: 500 }
    );
  }
}

