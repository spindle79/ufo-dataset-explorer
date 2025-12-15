import { NextRequest, NextResponse } from 'next/server';
import { getAllScrapedPages } from '@/lib/scrape-access';

export async function GET(request: NextRequest) {
  try {
    const scrapedPages = await getAllScrapedPages();
    
    // Extract all unique categories
    const categoriesSet = new Set<string>();
    scrapedPages.forEach(page => {
      page.categories.forEach(cat => {
        if (cat.trim()) {
          categoriesSet.add(cat.trim());
        }
      });
    });

    const categories = Array.from(categoriesSet).sort();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

