import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // -- Independent Native GDFlix Extractor --
    
    // 1. Fetch the GDFlix landing page
    const res = await fetch(url.trim(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': url.trim()
      }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch GDFlix link: HTTP ${res.status}` },
        { status: 500 }
      );
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const downloadLinks: Array<{ name: string; link: string }> = [];
    
    // 2. Extract direct Instant DL button
    $('a').each((_, el) => {
      const text = $(el).text().trim();
      let link = $(el).attr('href') || '';
      
      // Look for standard direct download buttons like 'Instant DL'
      if (link && !link.includes('javascript:void(0)') && 
          (text.toLowerCase().includes('instant') || 
           text.toLowerCase().includes('download') ||
           text.toLowerCase().includes('dl'))) {
          
          if (link.startsWith('//')) link = 'https:' + link;
          
          // Clean up the name
          let cleanName = text.replace(/\[\d+GBPS\]/i, '').trim();
          if (cleanName.toLowerCase() === 'login to dl') return; // Skip login buttons
          if (link.includes('login?ref=')) return;
          
          downloadLinks.push({
            name: cleanName || text,
            link: link
          });
      }
    });

    return NextResponse.json({
      success: true,
      originalUrl: url,
      links: downloadLinks
    });
    
  } catch (error) {
    console.error('Error in independent gdflix extractor:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
