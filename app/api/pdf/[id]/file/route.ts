import { NextRequest, NextResponse } from 'next/server';
import { getPdfFileById, getPdfFileBuffer } from '@/lib/pdf-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pdfFile = await getPdfFileById(id);

    if (!pdfFile) {
      return NextResponse.json(
        { error: 'PDF file not found' },
        { status: 404 }
      );
    }

    const buffer = await getPdfFileBuffer(id);
    if (!buffer) {
      return NextResponse.json(
        { error: 'PDF file data not found' },
        { status: 404 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': pdfFile.mimeType || 'application/pdf',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${pdfFile.fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving PDF file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to serve PDF file' },
      { status: 500 }
    );
  }
}

