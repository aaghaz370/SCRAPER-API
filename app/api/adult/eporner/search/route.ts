import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('q') || '';
    const page = searchParams.get('page') || '1';
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query parameter is required (use ?query=... or ?q=...)' },
        { status: 400 }
      );
    }

    const url = `https://www.eporner.com/search/${encodeURIComponent(query)}/${page}/`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = response.data;
    const $ = load(html);

    const videos: Array<{
      id: string;
      title: string;
      url: string;
      thumbnail: string;
      quality: string;
      duration: string;
      rating: string;
      views: string;
      uploader: string;
      uploaderUrl: string;
      isChannel: boolean;
    }> = [];

    // Parse videos from search results
    $('#vidresults .mb, #div-search-results .mb').each((_, element) => {
      const $item = $(element);
      
      const id = $item.attr('data-id') || '';
      
      // Skip if no ID
      if (!id) return;
      
      const $link = $item.find('.mbimg .mbcontent a');
      const href = $link.attr('href') || '';
      const videoUrl = href ? `https://www.eporner.com${href}` : '';
      
      const $img = $link.find('img');
      const thumbnail = $img.attr('src') || $img.attr('data-src') || '';
      const title = $img.attr('alt') || '';
      
      const quality = $item.find('.mvhdico span').text().trim();
      
      const duration = $item.find('.mbtim').text().trim();
      const rating = $item.find('.mbrate').text().trim();
      const views = $item.find('.mbvie').text().trim();
      
      const $uploader = $item.find('.mb-uploader a');
      const uploader = $uploader.text().trim();
      const uploaderHref = $uploader.attr('href') || '';
      const uploaderUrl = uploaderHref ? `https://www.eporner.com${uploaderHref}` : '';
      const isChannel = $item.find('.mb-uploader').hasClass('ischannel');
      
      videos.push({
        id,
        title,
        url: videoUrl,
        thumbnail,
        quality,
        duration,
        rating,
        views,
        uploader,
        uploaderUrl,
        isChannel
      });
    });

    return NextResponse.json({
      success: true,
      query,
      page,
      url,
      count: videos.length,
      videos
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
