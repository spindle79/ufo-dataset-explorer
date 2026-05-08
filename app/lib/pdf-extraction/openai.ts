/**
 * Extract text using OpenAI API
 * Uses OpenAI Responses API with file uploads to convert PDFs to Markdown
 */
import OpenAI, { toFile } from "openai";

const SYSTEM_INSTRUCTIONS = `
You convert PDF documents into GitHub-Flavored Markdown.
Return ONLY markdown (no preamble, no commentary, NO HTML).
Preserve reading order and structure (headings, lists, tables, footnotes).
If content is unclear, write [illegible] rather than inventing text.
NEVER use HTML tags - use only Markdown syntax.
`;

const DEV_RULES = `
Markdown rules (NO HTML):
- Use #/##/### headings when visually indicated.
- Use bullet/numbered lists where appropriate.
- Convert ALL tables to markdown tables (NEVER use HTML tables).
- Keep emphasis, code blocks, and quotes in markdown format.
- Remove repetitive headers/footers if they repeat on most pages.
- Insert a horizontal rule between pages: \n\n---\n\n
- Use ONLY markdown syntax - no HTML tags whatsoever.
`;

export async function extractWithOpenAI(
  pdfBuffer: Buffer,
  filename = "document.pdf",
  model: string = "gpt-4o-mini"
): Promise<{ text: string; metadata: any }> {
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Upload PDF (recommended purpose for model inputs is user_data)
  const uploaded = await client.files.create({
    file: await toFile(pdfBuffer, filename),
    purpose: "user_data",
  });

  const resp = await client.responses.create({
    model,
    instructions: SYSTEM_INSTRUCTIONS,
    input: [
      { role: "developer", content: DEV_RULES },
      {
        role: "user",
        content: [
          { type: "input_file", file_id: uploaded.id },
          { type: "input_text", text: "Convert the attached PDF to Markdown." },
        ],
      },
    ],
    // Note: Some models only support default temperature (1)
    // Removed temperature: 0 as it's not supported by all models
    // max_output_tokens: 8000, // optionally cap output
    // store: false, // optionally disable storage
  });

  return {
    text: resp.output_text,
    metadata: {
      service: "openai",
      method: "responses+file_id",
      model,
      fileId: uploaded.id,
      responseId: resp.id,
      bytes: pdfBuffer.length,
    },
  };
}
