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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const searchUrl = `${sb.replace(/\/$/, '')}/s/${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = response.data;
    const $ = load(html);

    // Extract related keywords/tags from the top section
    const relatedKeywords: Array<{ label: string; url: string }> = [];
    $('[data-testid="search-related-keywords"] [data-testid="tag"]').each((_, element) => {
      const $tag = $(element);
      const label = $tag.text().trim();
      const href = $tag.attr('href') || '';
      const fullUrl = href ? `${sb.replace(/\/$/, '')}${href}` : '';
      
      if (label && fullUrl) {
        relatedKeywords.push({ label, url: fullUrl });
      }
    });

    // Extract "Searches Related To" keywords
    const alsoSearchedFor: Array<{ label: string; url: string }> = [];
    $('[data-testid="searched-for-item"]').each((_, element) => {
      const $tag = $(element);
      const label = $tag.text().trim();
      const href = $tag.attr('href') || '';
      const fullUrl = href ? `${sb.replace(/\/$/, '')}${href}` : '';
      
      if (label && fullUrl) {
        alsoSearchedFor.push({ label, url: fullUrl });
      }
    });

    // Extract videos
    const videos: Array<{
      id: string;
      title: string;
      url: string;
      thumbnail: string;
      duration: string;
      resolution: string;
      views: string;
      rating: string;
      channel: string;
      channelUrl: string;
      badgeType: string;
    }> = [];

    $('[data-testid="video-item"].js-video-item').each((_, element) => {
      const $item = $(element);
      
      const id = $item.attr('data-id') || '';
      
      // Get the main video link
      const $link = $item.find('a').first();
      const url = $link.attr('href') || '';
      const fullUrl = url ? `${sb.replace(/\/$/, '')}${url}` : '';
      
      // Get thumbnail and title
      const $img = $link.find('picture img');
      const thumbnail = $img.attr('src') || $img.attr('data-src') || '';
      const title = $img.attr('alt') || '';
      
      // Get duration and resolution
      const duration = $link.find('[data-testid="video-item-length"]').text().trim();
      const resolution = $link.find('[data-testid="video-item-resolution"]').text().trim();
      
      // Get video info section
      const $videoInfo = $item.find('[data-testid="video-info-with-badge"]');
      
      // Get views and rating
      const views = $videoInfo.find('[data-testid="views"] span.md\\:text-body-md').text().trim();
      const rating = $videoInfo.find('[data-testid="rates"] span.md\\:text-body-md').text().trim();
      
      // Get channel/tag info
      const $channelLink = $videoInfo.find('[data-testid="title"] a');
      const channel = $channelLink.find('span').text().trim();
      const channelUrl = $channelLink.attr('href') || '';
      const fullChannelUrl = channelUrl ? `${sb.replace(/\/$/, '')}${channelUrl}` : '';
      
      // Get badge type (channel or tag)
      const $badge = $videoInfo.find('[data-testid="badge"]');
      const badgeType = $badge.attr('data-badge') || '';

      if (id && title && fullUrl) {
        videos.push({
          id,
          title,
          url: fullUrl,
          thumbnail,
          duration,
          resolution,
          views,
          rating,
          channel,
          channelUrl: fullChannelUrl,
          badgeType,
        });
      }
    });

    return NextResponse.json({
      success: true,
      query: query,
      searchUrl: searchUrl,
      totalResults: videos.length,
      relatedKeywords: relatedKeywords,
      alsoSearchedFor: alsoSearchedFor,
      videos: videos,
    });

  } catch (error) {
    console.error('Error processing SpankBang search:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process search',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
