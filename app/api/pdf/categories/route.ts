import { NextRequest, NextResponse } from 'next/server';
import { getAllPdfFiles } from '@/lib/pdf-access';

export async function GET(request: NextRequest) {
  try {
    const pdfFiles = await getAllPdfFiles();
    
    // Extract all unique categories
    const categorySet = new Set<string>();
    pdfFiles.forEach(file => {
      file.categories.forEach(cat => {
        if (cat.trim()) {
          categorySet.add(cat.trim().toLowerCase());
        }
      });
    });

    const categories = Array.from(categorySet).sort();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching PDF categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

