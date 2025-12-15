import { NextRequest, NextResponse } from 'next/server';
import { scrapePage } from '@/lib/scrape-utils';
import { createScrapedPage } from '@/lib/scrape-access';
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
        key.toLowerCase() === 'link' ||
        key.toLowerCase() === 'website' ||
        key.toLowerCase() === 'page_url'
    );

    if (!urlColumn) {
      return NextResponse.json(
        { error: 'CSV file must contain a column named "url", "link", "website", or "page_url"' },
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

        // Scrape the page
        const pageContent = await scrapePage(url);

        // Extract description and categories from CSV if available
        const description = record.description || record.desc || '';
        const categoriesStr = record.categories || record.category || '';
        const categories = categoriesStr
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        // Check if scraping actually failed
        const hasError = pageContent.markdown.includes('Error scraping page:');
        const errorMessage = hasError 
          ? pageContent.markdown.replace('Error scraping page: ', '').trim()
          : undefined;

        await createScrapedPage(
          {
            url,
            title: pageContent.title || url,
            description,
            categories,
          },
          pageContent.markdown,
          pageContent.text,
          pageContent.rawHtml,
          errorMessage
        );

        if (hasError) {
          failedCount++;
          errors.push(`Error scraping ${url}: ${errorMessage}`);
        } else {
          successCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedCount++;
        errors.push(`Error processing ${url}: ${errorMessage}`);
        
        // Create a record with the error
        try {
          const description = record.description || record.desc || '';
          const categoriesStr = record.categories || record.category || '';
          const categories = categoriesStr
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

          await createScrapedPage(
            {
              url,
              title: url,
              description,
              categories,
            },
            `Error scraping page: ${errorMessage}`,
            `Error scraping page: ${errorMessage}`,
            '', // No HTML on error
            errorMessage
          );
        } catch (createError) {
          // If we can't even create the error record, just log it
          console.error(`Failed to create error record for ${url}:`, createError);
        }
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

