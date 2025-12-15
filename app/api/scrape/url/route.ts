import { NextRequest, NextResponse } from 'next/server';
import { scrapePage } from '@/lib/scrape-utils';
import { createScrapedPage } from '@/lib/scrape-access';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, description, categories } = body;

    if (!urls) {
      return NextResponse.json(
        { error: 'URLs are required' },
        { status: 400 }
      );
    }

    // Support both single URL string and array of URLs
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    // Also support newline-separated URLs
    const allUrls: string[] = [];
    for (const url of urlArray) {
      if (typeof url === 'string') {
        // Split by newlines and filter empty strings
        const splitUrls = url.split('\n')
          .map(u => u.trim())
          .filter(u => u.length > 0);
        allUrls.push(...splitUrls);
      }
    }

    if (allUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }

    // Validate URLs
    const validUrls: string[] = [];
    for (const url of allUrls) {
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        // Skip invalid URLs
        console.warn(`Invalid URL skipped: ${url}`);
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs found' },
        { status: 400 }
      );
    }

    // Scrape each URL
    const results: Array<{ url: string; success: boolean; id?: string; error?: string }> = [];
    
    for (const url of validUrls) {
      try {
        const pageContent = await scrapePage(url);
        
        // Check if scraping actually failed (error in content)
        const hasError = pageContent.markdown.includes('Error scraping page:');
        const errorMessage = hasError 
          ? pageContent.markdown.replace('Error scraping page: ', '').trim()
          : undefined;
        
        const scrapedPage = await createScrapedPage(
          {
            url,
            title: pageContent.title || url,
            description: description || '',
            categories: categories || [],
          },
          pageContent.markdown,
          pageContent.text,
          pageContent.rawHtml,
          errorMessage
        );

        results.push({
          url,
          success: !hasError,
          id: scrapedPage.id,
          error: errorMessage,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if this is a database insert error (don't try to insert again)
        const isDatabaseError = errorMessage.includes('Failed to create scraped page');
        
        if (isDatabaseError) {
          // Database insert failed - don't try to insert again
          console.error(`Database insert failed for URL ${url}:`, errorMessage);
          results.push({
            url,
            success: false,
            error: errorMessage,
          });
        } else {
          // This is a scraping error - try to create an error record
          try {
            const scrapedPage = await createScrapedPage(
              {
                url,
                title: url,
                description: description || '',
                categories: categories || [],
              },
              `Error scraping page: ${errorMessage}`,
              `Error scraping page: ${errorMessage}`,
              '', // No HTML on error
              errorMessage
            );

            results.push({
              url,
              success: false,
              id: scrapedPage.id,
              error: errorMessage,
            });
          } catch (dbError) {
            // Even creating the error record failed
            console.error(`Failed to create error record for URL ${url}:`, dbError);
            results.push({
              url,
              success: false,
              error: `Scraping failed: ${errorMessage}. Database insert also failed.`,
            });
          }
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: validUrls.length,
      results,
    });
  } catch (error) {
    console.error('Error scraping URLs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape URLs' },
      { status: 500 }
    );
  }
}

