import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const query = searchParams.get('query') || '';
    
    let url = 'https://www.eporner.com/';
    
    if (query) {
      url = `https://www.eporner.com/search/${encodeURIComponent(query)}/${page}/`;
    } else if (page !== '1') {
      url = `https://www.eporner.com/${page}/`;
    }

    const proxyUrl = `https://nisansh.me/?url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
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

    // Parse videos from #div-search-results
    $('#div-search-results .mb').each((_, element) => {
      const $item = $(element);
      
      const id = $item.attr('data-id') || '';
      
      // Skip if no ID (ads or other elements)
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

    // Also parse from other sections
    $('#rec-best-vid .mb, #rec-for-country .mb, #rec-for-you .mb, #vidresults .mb, #rec-home .mb').each((_, element) => {
      const $item = $(element);
      
      const id = $item.attr('data-id') || '';
      
      // Skip if already added or no ID
      if (!id || videos.some(v => v.id === id)) return;
      
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
      url,
      count: videos.length,
      videos
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
