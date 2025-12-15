import { NextRequest, NextResponse } from 'next/server';
import { createPdfFile } from '@/lib/pdf-access';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No CSV file provided' },
        { status: 400 }
      );
    }

    // Read CSV file
    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or has no valid rows' },
        { status: 400 }
      );
    }

    // Find URL column (try common column names)
    const urlColumn = Object.keys(records[0]).find(
      key => 
        key.toLowerCase() === 'url' ||
        key.toLowerCase() === 'pdf_url' ||
        key.toLowerCase() === 'link' ||
        key.toLowerCase() === 'pdf_link'
    );

    if (!urlColumn) {
      return NextResponse.json(
        { error: 'CSV file must contain a column named "url", "pdf_url", "link", or "pdf_link"' },
        { status: 400 }
      );
    }

    // Process each URL
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      const url = record[urlColumn];
      if (!url || typeof url !== 'string') {
        failedCount++;
        continue;
      }

      try {
        // Validate URL
        new URL(url);

        // Try to fetch the PDF file
        const response = await fetch(url);
        if (!response.ok) {
          failedCount++;
          errors.push(`Failed to fetch ${url}: ${response.statusText}`);
          continue;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || (contentType !== 'application/pdf' && !url.toLowerCase().endsWith('.pdf'))) {
          failedCount++;
          errors.push(`URL ${url} does not point to a PDF file`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = url.split('/').pop() || 'pdf_file';

        // Extract description and categories from CSV if available
        const description = record.description || record.desc || '';
        const categoriesStr = record.categories || record.category || '';
        const categories = categoriesStr
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        await createPdfFile(
          {
            fileName,
            originalUrl: url,
            description,
            categories,
          },
          buffer,
          contentType || 'application/pdf'
        );

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Error processing ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: records.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}

