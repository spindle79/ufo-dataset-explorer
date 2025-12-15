import { NextRequest, NextResponse } from 'next/server';
import { getAudioFileById, getAudioFileBuffer } from '@/lib/audio-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const audioFile = await getAudioFileById(id);

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    const buffer = await getAudioFileBuffer(id);
    if (!buffer) {
      return NextResponse.json(
        { error: 'Audio file data not found' },
        { status: 404 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': audioFile.mimeType || 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${audioFile.fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to serve audio file' },
      { status: 500 }
    );
  }
}

