import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import axios from 'axios';
import { sb } from '@/app/url/baseurl';
import { validateProviderAccess, createProviderErrorResponse } from '@/lib/provider-validator';

export async function GET(request: NextRequest) {
  const validation = await validateProviderAccess(request, "Adult");
  if (!validation.valid) {
    return createProviderErrorResponse(validation.error || "Unauthorized");
  }

  try {
    const response = await axios.get(sb, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
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
      duration: string;
      views: string;
      rating: string;
      channel: string;
      channelUrl: string;
      isChannelBadge: boolean;
    }> = [];

    $('.js-video-item[data-testid="video-item"]').each((_, element) => {
      const $item = $(element);
      
      const id = $item.attr('data-id') || '';
      
      const $link = $item.find('a[data-testid="recommended-video"]');
      const url = $link.attr('href') || '';
      const fullUrl = url ? `${sb.replace(/\/$/, '')}${url}` : '';
      
      const $img = $link.find('picture img');
      const thumbnail = $img.attr('src') || '';
      const title = $img.attr('alt') || '';
      
      const duration = $link.find('[data-testid="video-item-length"]').text().trim();
      
      const $videoInfo = $item.find('[data-testid="video-info-with-badge"]');
      
      const views = $videoInfo.find('[data-testid="views"] span:last-child').text().trim();
      const rating = $videoInfo.find('[data-testid="rates"] span:last-child').text().trim();
      
      const $channelLink = $videoInfo.find('[data-testid="title"] a');
      const channel = $channelLink.find('span').text().trim();
      const channelUrl = $channelLink.attr('href') || '';
      const fullChannelUrl = channelUrl ? `${sb.replace(/\/$/, '')}${channelUrl}` : '';
      
      const isChannelBadge = $videoInfo.find('[data-badge="channel"]').length > 0;

      if (id && title && fullUrl) {
        videos.push({
          id,
          title,
          url: fullUrl,
          thumbnail,
          duration,
          views,
          rating,
          channel,
          channelUrl: fullChannelUrl,
          isChannelBadge,
        });
      }
    });

    return NextResponse.json({
      success: true,
      totalVideos: videos.length,
      videos: videos,
    });

  } catch (error) {
    console.error('Error processing SpankBang page:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process page',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
