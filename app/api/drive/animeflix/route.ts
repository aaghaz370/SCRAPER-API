import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ success: false, error: "URL required" }, { status: 400 });

    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    const $ = cheerio.load(html);

    const episodes: any[] = [];
    $('.entry-content a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().toLowerCase();
        
        if (!href || text.includes('comment') || text.includes('home') || text.includes('report')) return;
        
        // WP directory links (AnimeFlix /getlink/ or standard hubcloud/driveseed or WP Safelink sub-links)
        if (href.includes('getlink') || href.includes('hubcloud') || href.includes('driveseed') || href.includes('video-seed') || href.includes('unblockedgames') || href.includes('techy') || href.includes('tech2down')) {
            episodes.push({
                episode: $(el).text().trim() || "Link",
                size: "",
                hubCloudUrl: href.startsWith('http') ? href : new URL(href, url).href
            });
        }
    });

    return NextResponse.json({
        success: true,
        url,
        title: $(".entry-title").text().trim(),
        totalEpisodes: episodes.length,
        episodes
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
