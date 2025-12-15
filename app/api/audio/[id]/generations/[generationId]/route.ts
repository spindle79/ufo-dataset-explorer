import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAudioFile } from '@/lib/audio-access';

/**
 * GET /api/audio/[id]/generations/[generationId]
 * Get a specific AI generation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; generationId: string }> }
) {
  try {
    const { generationId } = await params;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('id', generationId)
      .single();

    if (error) {
      console.error('Error fetching AI generation:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'AI generation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI generation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/audio/[id]/generations/[generationId]
 * Update an AI generation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; generationId: string }> }
) {
  try {
    const { generationId } = await params;
    const body = await request.json();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_generations')
      .update(body)
      .eq('id', generationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI generation:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating AI generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update AI generation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audio/[id]/generations/[generationId]
 * Delete an AI generation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; generationId: string }> }
) {
  try {
    const { id, generationId } = await params;

    const supabase = await createClient();
    
    // Check if this is the current transcript
    const audioFile = await import('@/lib/audio-access').then(m => m.getAudioFileById(id));
    if (audioFile?.currentTranscriptId === generationId) {
      // Clear the current transcript reference
      await updateAudioFile(id, { currentTranscriptId: null });
    }

    const { error } = await supabase
      .from('ai_generations')
      .delete()
      .eq('id', generationId);

    if (error) {
      console.error('Error deleting AI generation:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete AI generation' },
      { status: 500 }
    );
  }
}

