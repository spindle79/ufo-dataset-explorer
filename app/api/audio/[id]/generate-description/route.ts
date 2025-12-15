import { NextRequest, NextResponse } from "next/server";
import { getAudioFileById, updateAudioFile } from "@/lib/audio-access";
import { generateDescription } from "@/lib/openai-description";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/audio/[id]/generate-description
 * Generate a description for an audio file using OpenAI gpt-5-nano
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const model = body.model || "gpt-5-nano";

    // Get the audio file
    const audioFile = await getAudioFileById(id);
    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    // Check if transcript is available
    if (!audioFile.currentTranscriptId) {
      return NextResponse.json(
        {
          error:
            "No transcript available for this audio file. Please transcribe the audio first.",
        },
        { status: 400 }
      );
    }

    // Fetch the current transcript
    const supabase = await createClient();
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("id", audioFile.currentTranscriptId)
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: "Current transcript not found" },
        { status: 404 }
      );
    }

    const content = generation.text_content;
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcript content is empty or unavailable" },
        { status: 400 }
      );
    }

    // Generate description using OpenAI
    let description: string;
    try {
      description = await generateDescription(content, model);
    } catch (error) {
      console.error("Error generating description:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate description",
        },
        { status: 500 }
      );
    }

    // Update the audio file with the generated description
    const updated = await updateAudioFile(id, { description });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update audio file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      description,
      file: updated,
    });
  } catch (error) {
    console.error("Error in generate-description endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate description",
      },
      { status: 500 }
    );
  }
}
