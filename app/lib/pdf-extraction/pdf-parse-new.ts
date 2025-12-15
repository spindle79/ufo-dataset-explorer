/**
 * Extract text using pdf-parse-new (Node-based alternative)
 */
export async function extractWithPdfParseNew(
  pdfBuffer: Buffer
): Promise<{ text: string; metadata: any }> {
  // Dynamic import to avoid issues if package is not installed
  let pdfParseNew;
  try {
    const pdfParseNewModule = await import("pdf-parse-new");
    // Handle both default export and direct export
    pdfParseNew = pdfParseNewModule.default || pdfParseNewModule;
  } catch (error) {
    throw new Error(
      "pdf-parse-new package not installed. Run: npm install pdf-parse-new"
    );
  }

  if (typeof pdfParseNew !== "function") {
    throw new Error("pdf-parse-new did not export a function");
  }

  const data = await pdfParseNew(pdfBuffer);

  return {
    text: data.text || "",
    metadata: {
      service: "pdfparsenew",
      pageCount: data.numpages || 0,
      info: data.info || {},
      metadata: data.metadata || {},
    },
  };
}

