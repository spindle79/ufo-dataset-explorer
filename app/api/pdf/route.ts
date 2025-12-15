import { NextRequest, NextResponse } from 'next/server';
import { getAllPdfFiles } from '@/lib/pdf-access';

export async function GET(request: NextRequest) {
  try {
    const pdfFiles = await getAllPdfFiles();
    return NextResponse.json(pdfFiles);
  } catch (error) {
    console.error('Error fetching PDF files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch PDF files' },
      { status: 500 }
    );
  }
}

