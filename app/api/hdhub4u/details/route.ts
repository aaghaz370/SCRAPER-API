import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface DownloadLink {
  quality: string;
  url: string;
  type?: string;
}

interface Episode {
  episode: string;
  links: DownloadLink[];
}

interface MovieDetails {
  title: string;
  imageUrl: string;
  description: string;
  downloadLinks: DownloadLink[];
  episodes: Episode[];
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch movie details" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1.entry-title').text().trim() ||
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') || '';
    const imageUrl = $('.entry-content img').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') || '';
    const description = $('.entry-content p').first().text().trim() || '';

    const downloadLinks: DownloadLink[] = [];
    const episodes: Episode[] = [];
    let currentEpisode: string | null = null;
    let currentEpisodeLinks: DownloadLink[] = [];

    // HDHub4u structure: download links are <a> tags INSIDE h3/h4/h5 headings
    // Quality text is the heading text itself. E.g: <h3><a href="gadgetsweb...">480p⚡[330MB]</a></h3>
    $('h3, h4, h5').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().trim();

      // Check if this is an episode header (e.g., "EPiSODE 1", "S01E01")
      if (headingText.match(/EPiSODE\s+\d+|S\d+E\d+|Episode\s+\d+/i) && !$heading.find('a[href]').length) {
        // Save previous episode if exists
        if (currentEpisode && currentEpisodeLinks.length > 0) {
          episodes.push({ episode: currentEpisode, links: [...currentEpisodeLinks] });
        }
        currentEpisode = headingText;
        currentEpisodeLinks = [];
        return;
      }

      // Each <a> inside this heading is a download link
      $heading.find('a').each((_, linkEl) => {
        const $link = $(linkEl);
        const linkUrl = $link.attr('href') || '';
        const linkText = $link.text().trim() || headingText;

        // Skip watch/player links (streaming, not download)
        if (!linkUrl || !linkUrl.startsWith('http')) return;
        if (linkText.toLowerCase().includes('watch online') || linkText.toLowerCase().includes('player-')) return;

        // Detect quality from text
        const qualityMatch = linkText.match(/(4k|2160p|1080p|720p|480p)/i);
        const link: DownloadLink = {
          quality: linkText,
          url: linkUrl,
          type: qualityMatch ? qualityMatch[1] : undefined,
        };

        if (currentEpisode) {
          currentEpisodeLinks.push(link);
        } else {
          downloadLinks.push(link);
        }
      });
    });

    // Save last episode
    if (currentEpisode && currentEpisodeLinks.length > 0) {
      episodes.push({ episode: currentEpisode, links: [...currentEpisodeLinks] });
    }

    // Also try getting links from <p> tags after headings (some hdhub pages use this layout)
    if (downloadLinks.length === 0 && episodes.length === 0) {
      $('p a').each((_, linkEl) => {
        const $link = $(linkEl);
        const linkUrl = $link.attr('href') || '';
        const linkText = $link.text().trim();
        if (linkUrl.startsWith('http') && linkText &&
          !linkText.toLowerCase().includes('watch') &&
          !linkUrl.includes('hdhub4u') && !linkUrl.includes('4khdhub')) {
          downloadLinks.push({ quality: linkText, url: linkUrl });
        }
      });
    }

    const movieDetails: MovieDetails = { title, imageUrl, description, downloadLinks, episodes };

    return NextResponse.json({ success: true, data: movieDetails });

  } catch (error) {
    console.error("Error in HDHub4u Details API:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
