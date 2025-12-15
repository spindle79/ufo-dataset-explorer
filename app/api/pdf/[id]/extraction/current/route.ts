import { NextRequest, NextResponse } from 'next/server';
import { updatePdfFile, getPdfFileById } from '@/lib/pdf-access';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/pdf/[id]/extraction/current
 * Set the current extraction for a PDF file
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { generationId } = body;

    // Verify the generation exists and belongs to this PDF file
    if (generationId) {
      const supabase = await createClient();
      const { data: generation, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('id', generationId)
        .eq('source_type', 'pdf')
        .eq('source_id', id)
        .like('generation_type', 'extraction-%')
        .single();

      if (error || !generation) {
        return NextResponse.json(
          { error: 'AI generation not found or does not belong to this PDF file' },
          { status: 404 }
        );
      }
    }

    // Update the PDF file with the current extraction ID
    const updated = await updatePdfFile(id, { currentExtractionId: generationId || null });

    if (!updated) {
      return NextResponse.json(
        { error: 'PDF file not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error setting current extraction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set current extraction' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pdf/[id]/extraction/current
 * Get the current extraction for a PDF file
 */
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

    if (!pdfFile.currentExtractionId) {
      return NextResponse.json(null);
    }

    const supabase = await createClient();
    const { data: generation, error } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('id', pdfFile.currentExtractionId)
      .single();

    if (error || !generation) {
      return NextResponse.json(
        { error: 'Current extraction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(generation);
  } catch (error) {
    console.error('Error fetching current extraction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch current extraction' },
      { status: 500 }
    );
  }
}

