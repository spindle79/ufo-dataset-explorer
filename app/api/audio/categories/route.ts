import { NextRequest, NextResponse } from 'next/server';
import { getAllAudioFiles } from '@/lib/audio-access';

export async function GET(request: NextRequest) {
  try {
    const audioFiles = await getAllAudioFiles();
    
    // Extract all unique categories
    const categorySet = new Set<string>();
    audioFiles.forEach(file => {
      file.categories.forEach(category => {
        if (category && category.trim()) {
          categorySet.add(category.trim().toLowerCase());
        }
      });
    });
    
    const categories = Array.from(categorySet).sort();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

