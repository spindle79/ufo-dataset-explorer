import { NextRequest, NextResponse } from 'next/server';
import { getAllAudioFiles } from '@/lib/audio-access';

export async function GET(request: NextRequest) {
  try {
    const audioFiles = await getAllAudioFiles();
    return NextResponse.json(audioFiles);
  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audio files' },
      { status: 500 }
    );
  }
}

