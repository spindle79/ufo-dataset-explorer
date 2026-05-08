import { NextRequest, NextResponse } from 'next/server';
import { getDomainsWithCounts, getPagesByDomain } from '@/lib/scrape-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const decodedDomain = decodeURIComponent(domain);

    // Get domain info with counts
    const allDomains = await getDomainsWithCounts();
    const domainInfo = allDomains.find((d) => d.domain === decodedDomain);

    if (!domainInfo) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Get basic page info for the domain
    const pages = await getPagesByDomain(decodedDomain);
    const pageCount = pages.length;

    // Find homepage (root URL) - check both http and https
    let homepagePage = null;
    let homepageUrl = `https://${decodedDomain}`;
    
    // First, try to find a page that matches the root path
    homepagePage = pages.find((p) => {
      try {
        const pageUrl = new URL(p.url);
        return (
          pageUrl.hostname === decodedDomain &&
          (pageUrl.pathname === "/" || pageUrl.pathname === "")
        );
      } catch {
        return false;
      }
    });

    // If found, use that page's URL; otherwise construct homepage URL
    if (homepagePage) {
      homepageUrl = homepagePage.url;
    } else {
      // Try to determine protocol from existing pages
      const firstPage = pages[0];
      if (firstPage) {
        try {
          const pageUrl = new URL(firstPage.url);
          homepageUrl = `${pageUrl.protocol}//${decodedDomain}`;
        } catch {
          // Default to https
          homepageUrl = `https://${decodedDomain}`;
        }
      }
    }

    return NextResponse.json({
      domain: decodedDomain,
      pageCount: domainInfo.pageCount,
      documentCount: domainInfo.documentCount,
      imageCount: domainInfo.imageCount,
      audioCount: domainInfo.audioCount,
      videoCount: domainInfo.videoCount,
      homepage: homepagePage
        ? {
            id: homepagePage.id,
            url: homepagePage.url,
            title: homepagePage.title,
            description: homepagePage.description,
          }
        : { url: homepageUrl },
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        url: p.url,
        description: p.description,
        scraped_date: p.scraped_date,
      })),
    });
  } catch (error) {
    console.error('Error fetching domain details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch domain details' },
      { status: 500 }
    );
  }
}

