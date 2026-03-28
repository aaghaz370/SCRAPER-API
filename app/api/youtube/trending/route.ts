import { NextRequest, NextResponse } from "next/server";
import { YOUTUBE_COOKIES } from "../cookies";export const preferredRegion = "lhr1";

// ─── YouTube Trending using HTML scrape fallback ─────────────────────────────
// Tries InnerTube browse first, falls back to scraping ytInitialData from page.

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

interface TrendingVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  viewCount: string;
  publishedAt: string;
  duration: string;
  description: string;
}

const CATEGORY_PARAMS: Record<string, string> = {
  all: "",
  music: "4gINGgt5dG1hX2NoYXJ0cw%3D%3D",
  gaming: "4gIcGhpnYW1pbmdfY29ycHVz",
  movies: "4gIKGghtb3ZpZXM%3D",
  news: "4gIIGgZuZXdz",
  sports: "4gIJGgdzcG9ydHM%3D",
  learning: "4gIMGgpsZWFybmluZw%3D%3D",
  fashion: "4gIOGgxmYXNoaW9u",
};

function getText(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (obj.simpleText) return obj.simpleText;
  if (obj.runs) return (obj.runs as any[]).map((r: any) => r.text || "").join("");
  return "";
}

function getBestThumb(thumbnails: any[]): string {
  if (!thumbnails?.length) return "";
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || "";
}

function extractVideosFromData(data: any): TrendingVideo[] {
  const videos: TrendingVideo[] = [];

  function walk(obj: any, depth = 0): void {
    if (!obj || typeof obj !== "object" || depth > 20) return;

    if (obj.videoId && obj.title) {
      const title = getText(obj.title);
      if (title && obj.videoId.length === 11) {
        videos.push({
          videoId: obj.videoId,
          title,
          thumbnail: getBestThumb(obj.thumbnail?.thumbnails || []),
          channelName: getText(obj.ownerText || obj.longBylineText || obj.shortBylineText || obj.author || ""),
          viewCount: getText(obj.viewCountText || obj.shortViewCountText || ""),
          publishedAt: getText(obj.publishedTimeText || ""),
          duration: getText(
            obj.lengthText ||
            obj.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text ||
            ""
          ),
          description: getText(obj.detailedMetadataSnippets?.[0]?.snippetText || obj.descriptionSnippet || ""),
        });
        return;
      }
    }

    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, depth + 1);
    } else {
      for (const key of Object.keys(obj)) {
        walk(obj[key], depth + 1);
      }
    }
  }

  walk(data);

  // Deduplicate by videoId
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });
}

// ─── Method 1: InnerTube browse API ──────────────────────────────────────────
async function fetchTrendingInnerTube(category: string): Promise<TrendingVideo[]> {
  const params = CATEGORY_PARAMS[category] || "";

  const body: any = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240506.00.00",
        hl: "en",
        gl: "US",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        browserName: "Chrome",
        browserVersion: "124.0.0.0",
        osName: "Windows",
        osVersion: "10.0",
      },
    },
    browseId: "FEtrending",
  };

  if (params) body.params = params;

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...COMMON_HEADERS,
        "Cookie": process.env.YOUTUBE_COOKIE || YOUTUBE_COOKIES || "",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240506.00.00",
        "Origin": "https://www.youtube.com",
        "Referer": "https://www.youtube.com/feed/trending",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`InnerTube browse failed: ${res.status}`);
  }

  const data = await res.json();
  const videos = extractVideosFromData(data);
  if (videos.length === 0) throw new Error("No videos in InnerTube browse response");
  return videos;
}

// ─── Method 2: Scrape ytInitialData from page HTML ───────────────────────────
async function fetchTrendingFromPage(category: string): Promise<TrendingVideo[]> {
  const categoryPaths: Record<string, string> = {
    all: "/feed/trending",
    music: "/feed/trending?bp=4gINGgt5dG1hX2NoYXJ0cw%3D%3D",
    gaming: "/feed/trending?bp=4gIcGhpnYW1pbmdfY29ycHVz",
    movies: "/feed/trending?bp=4gIKGghtb3ZpZXM%3D",
    news: "/feed/trending?bp=4gIIGgZuZXdz",
    sports: "/feed/trending?bp=4gIJGgdzcG9ydHM%3D",
    learning: "/feed/trending?bp=4gIMGgpsZWFybmluZw%3D%3D",
    fashion: "/feed/trending?bp=4gIOGgxmYXNoaW9u",
  };

  const path = categoryPaths[category] || categoryPaths.all;

  const res = await fetch(`https://www.youtube.com${path}`, {
    headers: {
      ...COMMON_HEADERS,
      "Cookie": process.env.YOUTUBE_COOKIE || YOUTUBE_COOKIES || "CONSENT=YES+1; SOCS=CAESEwgDEgk0OTcxMzI3NTIaAmVuIAEaBgiAlLKxBg==",
      "Referer": "https://www.youtube.com/",
    },
  });

  if (!res.ok) throw new Error(`Page fetch failed: ${res.status}`);

  const html = await res.text();

  // Balanced-brace JSON extraction — works for any size JSON block
  function extractJson(src: string, marker: string): any | null {
    const idx = src.indexOf(marker);
    if (idx === -1) return null;
    const start = src.indexOf("{", idx);
    if (start === -1) return null;
    let depth = 0, inStr = false, escape = false;
    for (let i = start; i < Math.min(src.length, start + 5_000_000); i++) {
      const ch = src[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) {
        try { return JSON.parse(src.slice(start, i + 1)); } catch { return null; }
      }}
    }
    return null;
  }

  const data =
    extractJson(html, "var ytInitialData =") ||
    extractJson(html, "ytInitialData =") ||
    extractJson(html, "ytInitialData=");

  if (!data) throw new Error("ytInitialData not found in page HTML");

  const videos = extractVideosFromData(data);
  if (videos.length === 0) throw new Error("HTML scrape: 0 videos extracted");
  return videos;
}

// ─── Method 3: Fallback - use search for popular content ─────────────────────
async function fetchTrendingViaSearch(category: string): Promise<TrendingVideo[]> {
  const queries: Record<string, string> = {
    all: "trending viral videos 2025",
    music: "top hindi songs 2025 new",
    gaming: "gaming highlights 2025",
    movies: "best movies 2025 trailer",
    news: "breaking news today 2025",
    sports: "sports best moments 2025",
    learning: "learn something new 2025",
    fashion: "fashion trends 2025",
  };

  const query = queries[category] || queries.all;

  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240506.00.00",
        hl: "en",
        gl: "US",
      },
    },
    query,
    params: "EgIQAQ%3D%3D",
  };

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...COMMON_HEADERS,
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240506.00.00",
        "Origin": "https://www.youtube.com",
        "Referer": "https://www.youtube.com/",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error(`Search fallback failed: ${res.status}`);
  const data = await res.json();
  return extractVideosFromData(data);
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("category") || "all").toLowerCase();

    const validCategories = Object.keys(CATEGORY_PARAMS);
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Valid: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Try methods in order
    let videos: TrendingVideo[] = [];
    let method = "";

    try {
      videos = await fetchTrendingInnerTube(category);
      method = "innertube-browse";
    } catch (e1) {
      console.warn("[trending] InnerTube browse failed:", (e1 as Error).message);
      try {
        videos = await fetchTrendingFromPage(category);
        method = "html-scrape";
      } catch (e2) {
        console.warn("[trending] HTML scrape failed:", (e2 as Error).message);
        videos = await fetchTrendingViaSearch(category);
        method = "search-fallback";
      }
    }

    return NextResponse.json({
      success: true,
      category,
      method,
      count: videos.length,
      videos: videos.slice(0, 40),
    });
  } catch (error) {
    console.error("[youtube/trending]", error);
    return NextResponse.json(
      {
        error: "Trending fetch failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
