import { NextRequest, NextResponse } from "next/server";
import {
  getVideoFileById,
  getVideoFileBuffer,
  updateVideoFile,
} from "@/lib/video-access";
import {
  getNextGenerationVersion,
  createGenerationData,
  generateGenerationType,
} from "@/lib/ai-generation-utils";

type TranscriptionService =
  | "whisper"
  | "assemblyai"
  | "gpt-4o-transcribe"
  | "gpt-4o-transcribe-diarize";

/**
 * Transcribe using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ text: string; metadata: any }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const videoFileBlob = new Blob([new Uint8Array(audioBuffer)], {
    type: mimeType || "video/mp4",
  });
  const videoFileForApi = new File([videoFileBlob], fileName, {
    type: mimeType || "video/mp4",
  });

  const formData = new FormData();
  formData.append("file", videoFileForApi);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${errorData.error?.message || "Unknown error"}`
    );
  }

  const data = await response.json();
  return {
    text: data.text || "",
    metadata: {
      model: "whisper-1",
      service: "whisper",
      language: data.language || null,
      duration: data.duration || null,
      segments: data.segments || [],
    },
  };
}

/**
 * Transcribe using Assembly AI API with summarization
 */
async function transcribeWithAssemblyAI(
  audioBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ text: string; summary?: string; metadata: any }> {
  const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyApiKey) {
    throw new Error("Assembly AI API key not configured");
  }

  // Step 1: Upload audio file
  const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: assemblyApiKey,
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}));
    throw new Error(
      `Assembly AI upload error: ${errorData.error || "Unknown error"}`
    );
  }

  const uploadData = await uploadResponse.json();
  const uploadUrl = uploadData.upload_url;

  // Step 2: Submit transcription job with summarization
  const transcriptResponse = await fetch(
    "https://api.assemblyai.com/v2/transcript",
    {
      method: "POST",
      headers: {
        authorization: assemblyApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        language_detection: true,
        summarization: true,
        summary_model: "informative",
        summary_type: "paragraph",
        punctuate: true,
        format_text: true,
        speaker_labels: true, // Enable speaker diarization
      }),
    }
  );

  if (!transcriptResponse.ok) {
    const errorData = await transcriptResponse.json().catch(() => ({}));
    throw new Error(
      `Assembly AI transcription error: ${errorData.error || "Unknown error"}`
    );
  }

  const transcriptData = await transcriptResponse.json();
  const transcriptId = transcriptData.id;

  // Step 3: Poll for completion
  let status = transcriptData.status;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5 second intervals)

  while (
    status !== "completed" &&
    status !== "error" &&
    attempts < maxAttempts
  ) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    const statusResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          authorization: assemblyApiKey,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error("Failed to check transcription status");
    }

    const statusData = await statusResponse.json();
    status = statusData.status;

    if (status === "completed") {
      // Format text with speaker labels if utterances are available
      let formattedText = statusData.text || "";
      const utterances = statusData.utterances || [];

      // If we have utterances with speaker information, format them
      if (utterances.length > 0 && utterances.some((u: any) => u.speaker)) {
        formattedText = formatAssemblyAIUtterances(utterances);
      }

      return {
        text: formattedText,
        summary: statusData.summary || undefined,
        metadata: {
          model: "assemblyai-universal-2",
          service: "assemblyai",
          language: statusData.language_code || null,
          confidence: statusData.confidence || null,
          words: statusData.words || [],
          utterances: utterances,
          speaker_labels: statusData.speaker_labels || null,
          summary: statusData.summary || null,
        },
      };
    }

    attempts++;
  }

  if (status === "error") {
    throw new Error(
      `Assembly AI transcription failed: ${
        transcriptData.error || "Unknown error"
      }`
    );
  }

  throw new Error("Transcription timed out");
}

/**
 * Transcribe using OpenAI GPT-4o API with timestamps
 */
async function transcribeWithGPT4o(
  audioBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ text: string; metadata: any }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const videoFileBlob = new Blob([new Uint8Array(audioBuffer)], {
    type: mimeType || "video/mp4",
  });
  const videoFileForApi = new File([videoFileBlob], fileName, {
    type: mimeType || "video/mp4",
  });

  const formData = new FormData();
  formData.append("file", videoFileForApi);
  formData.append("model", "gpt-4o-transcribe");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");
  formData.append("timestamp_granularities[]", "word");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${errorData.error?.message || "Unknown error"}`
    );
  }

  const data = await response.json();
  return {
    text: data.text || "",
    metadata: {
      model: "gpt-4o-transcribe",
      service: "gpt-4o-transcribe",
      language: data.language || null,
      duration: data.duration || null,
      segments: data.segments || [],
      words: data.words || [],
    },
  };
}

/**
 * Merge consecutive segments from the same speaker into larger chunks
 */
function mergeSpeakerSegments(segments: any[]): any[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const merged: any[] = [];
  let currentChunk: any = null;

  for (const segment of segments) {
    const speaker = segment.speaker || "Unknown";
    const text = segment.text?.trim() || "";

    if (!text) continue;

    // If this is the same speaker as the current chunk, merge it
    if (
      currentChunk &&
      currentChunk.speaker === speaker &&
      // Only merge if segments are close together (within 2 seconds gap)
      segment.start - currentChunk.end < 2.0
    ) {
      // Merge the text
      currentChunk.text = `${currentChunk.text} ${text}`;
      // Update end time
      currentChunk.end = segment.end;
      // Keep track of all segment IDs
      if (!currentChunk.segmentIds) {
        currentChunk.segmentIds = [currentChunk.id];
      }
      currentChunk.segmentIds.push(segment.id);
    } else {
      // Start a new chunk
      if (currentChunk) {
        merged.push(currentChunk);
      }
      currentChunk = {
        ...segment,
        speaker,
        text,
        segmentIds: [segment.id],
      };
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    merged.push(currentChunk);
  }

  return merged;
}

/**
 * Format merged segments as a readable transcript with speaker labels
 */
function formatTranscriptFromChunks(chunks: any[]): string {
  if (!chunks || chunks.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const chunk of chunks) {
    const speaker = chunk.speaker || "Unknown";
    const text = chunk.text?.trim() || "";
    const startTime = chunk.start || 0;
    const endTime = chunk.end || 0;

    if (!text) continue;

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Format as: [Speaker A] (0:02 - 0:11) Text content
    lines.push(
      `[Speaker ${speaker}] (${formatTime(startTime)} - ${formatTime(
        endTime
      )})\n${text}\n`
    );
  }

  return lines.join("\n");
}

/**
 * Format AssemblyAI utterances as a readable transcript with speaker labels
 * AssemblyAI uses milliseconds for timestamps, so we need to convert to seconds
 */
function formatAssemblyAIUtterances(utterances: any[]): string {
  if (!utterances || utterances.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const utterance of utterances) {
    const speaker = utterance.speaker || "Unknown";
    const text = utterance.text?.trim() || "";
    // AssemblyAI uses milliseconds, convert to seconds
    const startTime = (utterance.start || 0) / 1000;
    const endTime = (utterance.end || 0) / 1000;

    if (!text) continue;

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Format as: [Speaker A] (0:02 - 0:11) Text content
    lines.push(
      `[Speaker ${speaker}] (${formatTime(startTime)} - ${formatTime(
        endTime
      )})\n${text}\n`
    );
  }

  return lines.join("\n");
}

/**
 * Transcribe using OpenAI GPT-4o API with diarization
 */
async function transcribeWithGPT4oDiarize(
  audioBuffer: Buffer,
  fileName: string,
  mimeType: string,
  options?: { mergeChunks?: boolean }
): Promise<{ text: string; metadata: any }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const mergeChunks = options?.mergeChunks !== false; // Default to true

  const videoFileBlob = new Blob([new Uint8Array(audioBuffer)], {
    type: mimeType || "video/mp4",
  });
  const videoFileForApi = new File([videoFileBlob], fileName, {
    type: mimeType || "video/mp4",
  });

  const formData = new FormData();
  formData.append("file", videoFileForApi);
  formData.append("model", "gpt-4o-transcribe-diarize");
  formData.append("response_format", "diarized_json");
  formData.append("chunking_strategy", "auto");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${errorData.error?.message || "Unknown error"}`
    );
  }

  const data = await response.json();

  // Get original segments
  const originalSegments = data.segments || [];

  // Merge segments if requested
  let text: string;
  let mergedChunks: any[] = [];

  if (mergeChunks && originalSegments.length > 0) {
    mergedChunks = mergeSpeakerSegments(originalSegments);
    text = formatTranscriptFromChunks(mergedChunks);
  } else {
    // Build text from segments for compatibility (original behavior)
    text =
      originalSegments.map((seg: any) => seg.text).join(" ") || data.text || "";
  }

  return {
    text,
    metadata: {
      model: "gpt-4o-transcribe-diarize",
      service: "gpt-4o-transcribe-diarize",
      language: data.language || null,
      duration: data.duration || null,
      segments: originalSegments, // Always include original segments
      mergedChunks: mergeChunks ? mergedChunks : undefined, // Include merged chunks if created
    },
  };
}

/**
 * POST /api/video/[id]/transcribe
 * Transcribe a video file using OpenAI Whisper API, Assembly AI, or GPT-4o
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const service: TranscriptionService = body.service || "whisper";
    const saveSummaryAsDescription = body.saveSummaryAsDescription || false;
    const mergeChunks = body.mergeChunks !== false; // Default to true for diarization

    const validServices: TranscriptionService[] = [
      "whisper",
      "assemblyai",
      "gpt-4o-transcribe",
      "gpt-4o-transcribe-diarize",
    ];
    if (!validServices.includes(service)) {
      return NextResponse.json(
        {
          error: `Invalid service. Must be one of: ${validServices.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const videoFile = await getVideoFileById(id);
    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    // Get video file buffer
    const videoBuffer = await getVideoFileBuffer(id);
    if (!videoBuffer) {
      return NextResponse.json(
        { error: "Failed to load video file" },
        { status: 500 }
      );
    }

    // Transcribe using the selected service
    // Note: Transcription services can handle video files directly
    let transcriptionResult: { text: string; summary?: string; metadata: any };
    try {
      if (service === "whisper") {
        transcriptionResult = await transcribeWithWhisper(
          videoBuffer,
          videoFile.fileName,
          videoFile.mimeType || "video/mp4"
        );
      } else if (service === "assemblyai") {
        transcriptionResult = await transcribeWithAssemblyAI(
          videoBuffer,
          videoFile.fileName,
          videoFile.mimeType || "video/mp4"
        );
      } else if (service === "gpt-4o-transcribe") {
        transcriptionResult = await transcribeWithGPT4o(
          videoBuffer,
          videoFile.fileName,
          videoFile.mimeType || "video/mp4"
        );
      } else if (service === "gpt-4o-transcribe-diarize") {
        transcriptionResult = await transcribeWithGPT4oDiarize(
          videoBuffer,
          videoFile.fileName,
          videoFile.mimeType || "video/mp4",
          { mergeChunks }
        );
      } else {
        throw new Error(`Unknown service: ${service}`);
      }
    } catch (error) {
      console.error(`Error transcribing with ${service}:`, error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : `Failed to transcribe with ${service}`,
        },
        { status: 500 }
      );
    }

    // Save summary as description if requested and available (AssemblyAI only)
    if (
      saveSummaryAsDescription &&
      "summary" in transcriptionResult &&
      transcriptionResult.summary
    ) {
      try {
        await updateVideoFile(id, {
          description: transcriptionResult.summary,
        });
      } catch (error) {
        console.error("Error saving summary as description:", error);
        // Don't fail the request if this fails
      }
    }

    // Get the next version number and create generation data
    const generationType = generateGenerationType("transcript", service);
    const nextVersion = await getNextGenerationVersion(
      "video",
      id,
      generationType
    );
    const generationData = createGenerationData(
      "video",
      id,
      generationType,
      nextVersion,
      transcriptionResult.text,
      transcriptionResult.metadata
    );

    // Automatic entity extraction if enabled
    let entityExtractionResult: any = null;
    if (
      process.env.ENABLE_AUTO_ENTITY_EXTRACTION === 'true' &&
      transcriptionResult.text
    ) {
      try {
        const { extractEntitiesWithNeo4j } = await import(
          '@/lib/entity-extraction/neo4j-enhanced'
        );
        const { getOrCreatePerson, getOrCreateLocation, getOrCreateCompany, getOrCreateProgram } = await import(
          '@/lib/entity-relationships'
        );
        const {
          createPersonRelationship,
          createLocationRelationship,
          createCompanyRelationship,
          createProgramRelationship,
        } = await import('@/lib/entity-relationships');
        const { syncPersonToNeo4j, syncLocationToNeo4j, syncCompanyToNeo4j, syncProgramToNeo4j } = await import('@/lib/neo4j/sync');
        const { syncPersonRelationshipToNeo4j, syncLocationRelationshipToNeo4j, syncCompanyRelationshipToNeo4j, syncProgramRelationshipToNeo4j } = await import('@/lib/neo4j/sync');

        entityExtractionResult = await extractEntitiesWithNeo4j(
          transcriptionResult.text,
          id,
          'video'
        );

        // Save entities to Supabase and sync to Neo4j
        for (const person of entityExtractionResult.people) {
          try {
            const personId = await getOrCreatePerson(
              person.canonicalName || person.name,
              person.aliases || []
            );
            await createPersonRelationship(personId, 'video', id);
            
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncPersonToNeo4j(personId, person.canonicalName || person.name, person.aliases || []);
              await syncPersonRelationshipToNeo4j(personId, 'video', id);
            }
          } catch (err) {
            console.warn(`Failed to save person ${person.name}:`, err);
          }
        }

        for (const location of entityExtractionResult.locations) {
          try {
            const locationId = await getOrCreateLocation(
              location.canonicalName || location.name,
              location.aliases || [],
              {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country,
              }
            );
            await createLocationRelationship(locationId, 'video', id);
            
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncLocationToNeo4j(
                locationId,
                location.canonicalName || location.name,
                location.aliases || [],
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  address: location.address,
                  city: location.city,
                  state: location.state,
                  country: location.country,
                }
              );
              await syncLocationRelationshipToNeo4j(locationId, 'video', id);
            }
          } catch (err) {
            console.warn(`Failed to save location ${location.name}:`, err);
          }
        }

        for (const company of entityExtractionResult.companies) {
          try {
            const companyId = await getOrCreateCompany(
              company.canonicalName || company.name,
              company.aliases || []
            );
            await createCompanyRelationship(companyId, 'video', id);
            
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncCompanyToNeo4j(companyId, company.canonicalName || company.name, company.aliases || []);
              await syncCompanyRelationshipToNeo4j(companyId, 'video', id);
            }
          } catch (err) {
            console.warn(`Failed to save company ${company.name}:`, err);
          }
        }

        for (const program of entityExtractionResult.programs) {
          try {
            const programId = await getOrCreateProgram(
              program.canonicalName || program.name,
              program.aliases || [],
              program.description
            );
            await createProgramRelationship(programId, 'video', id);
            
            if (process.env.ENABLE_NEO4J_SYNC === 'true') {
              await syncProgramToNeo4j(programId, program.canonicalName || program.name, program.aliases || [], program.description);
              await syncProgramRelationshipToNeo4j(programId, 'video', id);
            }
          } catch (err) {
            console.warn(`Failed to save program ${program.name}:`, err);
          }
        }
      } catch (entityError) {
        console.error('Error in automatic entity extraction:', entityError);
        // Don't fail the request if entity extraction fails
      }
    }

    // Return the transcript for preview (not saved to DB yet)
    return NextResponse.json({
      transcript: transcriptionResult.text,
      summary:
        "summary" in transcriptionResult
          ? transcriptionResult.summary
          : undefined,
      version: nextVersion,
      service,
      metadata: generationData.metadata,
      generationData, // Include the full data structure for saving
      entities: entityExtractionResult
        ? {
            people: entityExtractionResult.people.length,
            locations: entityExtractionResult.locations.length,
            companies: entityExtractionResult.companies.length,
            programs: entityExtractionResult.programs.length,
            relationships: entityExtractionResult.relationships?.length || 0,
          }
        : null,
    });
  } catch (error) {
    console.error("Error transcribing video:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to transcribe video",
      },
      { status: 500 }
    );
  }
}
