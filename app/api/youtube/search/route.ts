import { NextRequest, NextResponse } from "next/server";

// ─── YouTube InnerTube API – no third-party deps, works on Vercel ─────────────
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
// WEB client triggers YouTube's bot-check on datacenter IPs.
// Use WEB with proper headers instead — results still come through even
// if YouTube adds a "sign in" banner (which only affects the HTML page, not JSON API).
const INNERTUBE_CLIENT = {
  clientName: "WEB",
  clientVersion: "2.20240101.00.00",
  hl: "en",
  gl: "US",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";


// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoResult {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  channelName: string;
  channelId: string;
  viewCount: string;
  publishedAt: string;
  isLive: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getText(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (obj.simpleText) return obj.simpleText;
  if (obj.runs && Array.isArray(obj.runs))
    return obj.runs.map((r: any) => r.text || "").join("");
  return "";
}

function getThumbnail(thumbnails: any[]): string {
  if (!thumbnails || thumbnails.length === 0) return "";
  // Pick highest quality
  return thumbnails[thumbnails.length - 1]?.url || "";
}

function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(":").reverse();
  let seconds = 0;
  if (parts[0]) seconds += parseInt(parts[0]) || 0;
  if (parts[1]) seconds += (parseInt(parts[1]) || 0) * 60;
  if (parts[2]) seconds += (parseInt(parts[2]) || 0) * 3600;
  return seconds;
}

function parseVideoRenderer(renderer: any): VideoResult | null {
  if (!renderer?.videoId) return null;

  const videoId: string = renderer.videoId;
  const title = getText(renderer.title);
  const description = getText(renderer.detailedMetadataSnippets?.[0]?.snippetText || renderer.descriptionSnippet || "");
  const thumbnail = getThumbnail(renderer.thumbnail?.thumbnails || []);
  const durationText = getText(renderer.lengthText);
  const durationSeconds = parseDuration(durationText);
  const channelName = getText(renderer.ownerText || renderer.longBylineText || renderer.shortBylineText);
  const channelId =
    renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    renderer.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    "";
  const viewCountText = getText(renderer.viewCountText);
  const publishedText = getText(renderer.publishedTimeText);
  const isLive = !!renderer.badges?.some((b: any) =>
    getText(b?.metadataBadgeRenderer?.label).toLowerCase().includes("live")
  );

  return {
    videoId,
    title,
    description,
    thumbnail,
    duration: durationText,
    durationSeconds,
    channelName,
    channelId,
    viewCount: viewCountText,
    publishedAt: publishedText,
    isLive,
  };
}

// ─── Main Scraper ─────────────────────────────────────────────────────────────
async function searchYouTube(query: string, maxResults = 20): Promise<VideoResult[]> {
  const body = {
    context: {
      client: INNERTUBE_CLIENT,
    },
    query,
    params: "EgIQAQ%3D%3D", // Filter: videos only
  };

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": INNERTUBE_CLIENT.clientVersion,
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "https://www.youtube.com",
        "Referer": "https://www.youtube.com/",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`YouTube InnerTube search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];

  const results: VideoResult[] = [];

  for (const section of contents) {
    const items =
      section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      if (item.videoRenderer) {
        const parsed = parseVideoRenderer(item.videoRenderer);
        if (parsed) results.push(parsed);
        if (results.length >= maxResults) break;
      }
    }
    if (results.length >= maxResults) break;
  }

  return results;
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || url.searchParams.get("query");
    const limitStr = url.searchParams.get("limit") || "20";
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing search query. Use ?q=your+search" },
        { status: 400 }
      );
    }

    const results = await searchYouTube(query.trim(), limit);

    return NextResponse.json({
      success: true,
      query: query.trim(),
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("[youtube/search]", error);
    return NextResponse.json(
      {
        error: "YouTube search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
