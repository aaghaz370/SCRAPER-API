import { NextRequest, NextResponse } from "next/server";
import { fetchPeakPX } from "../_utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface WallpaperDetail {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  thumbnailUrl: string;   // Same as imageUrl for detail page (full-res)
  imageUrl: string;       // Full-resolution image URL from #fig img or og:image
  downloadUrl: string;    // Direct download link — no ads, no redirects
  width?: number;
  height?: number;
  resolution?: string;
  fileSize?: string;
  tags?: string[];
  category?: string;
}

function parseWallpaperDetail(html: string, pageUrl: string): WallpaperDetail {
  const slug = pageUrl.split("/").filter(Boolean).pop() || "";

  // ── Title ──────────────────────────────────────────────────────────────────
  let title = "";
  const ogTitleMatch =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
  if (ogTitleMatch) title = ogTitleMatch[1].replace(/ (?:hd )?wallpaper$/i, "").trim();

  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) title = h1Match[1].replace(/ (?:hd )?wallpaper$/i, "").trim();
  }

  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/ (?:hd )?wallpaper.*/i, "").trim();
  }

  // ── Full-resolution image URL ──────────────────────────────────────────────
  // Primary: <div id="fig"><img src="..." /></div>
  let imageUrl = "";

  const figMatch = html.match(/id="fig"[\s\S]{0,500}?<img[^>]+src="([^"]+)"/i);
  if (figMatch) imageUrl = figMatch[1];

  // Secondary: og:image meta tag
  if (!imageUrl) {
    const ogImgMatch =
      html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    if (ogImgMatch) imageUrl = ogImgMatch[1];
  }

  // Tertiary: any w0-w9.peakpx.com image URL in HTML
  if (!imageUrl) {
    const cdnMatch = html.match(
      /https?:\/\/w\d+\.peakpx\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i
    );
    if (cdnMatch) imageUrl = cdnMatch[0];
  }

  // imageUrl IS the full-res wallpaper — use as both thumbnail and image
  const thumbnailUrl = imageUrl;

  // ── Download URL ───────────────────────────────────────────────────────────
  // Look for an explicit download anchor
  let downloadUrl = imageUrl;
  const dlPatterns = [
    /href="([^"]+)"[^>]*>\s*(?:[\s\S]*?)\bDownload\b/i,
    /class="[^"]*download[^"]*"[^>]*href="([^"]+)"/i,
    /href="([^"]+)"[^>]*class="[^"]*download[^"]*"/i,
  ];
  for (const pattern of dlPatterns) {
    const dlMatch = html.match(pattern);
    if (dlMatch) {
      const dl = dlMatch[1];
      if (dl.startsWith("http")) {
        downloadUrl = dl;
        break;
      } else if (dl.startsWith("/")) {
        downloadUrl = `https://www.peakpx.com${dl}`;
        break;
      }
    }
  }

  // ── Dimensions ────────────────────────────────────────────────────────────
  let width: number | undefined;
  let height: number | undefined;

  const wMatch =
    html.match(/<meta[^>]+property="og:image:width"[^>]+content="(\d+)"/i) ||
    html.match(/<meta[^>]+content="(\d+)"[^>]+property="og:image:width"/i);
  const hMatch =
    html.match(/<meta[^>]+property="og:image:height"[^>]+content="(\d+)"/i) ||
    html.match(/<meta[^>]+content="(\d+)"[^>]+property="og:image:height"/i);

  if (wMatch) width = parseInt(wMatch[1]);
  if (hMatch) height = parseInt(hMatch[1]);

  if (!width || !height) {
    // Try "1920x1080", "1920 x 1080", "1920×1080" patterns in body text
    const resMatch = html.match(/\b(\d{3,5})\s*[x×X]\s*(\d{3,5})\b/);
    if (resMatch) {
      const w = parseInt(resMatch[1]);
      const h = parseInt(resMatch[2]);
      // Sanity: typical wallpaper ratios
      if (w >= 640 && h >= 400 && w <= 10000 && h <= 10000) {
        width = w;
        height = h;
      }
    }
  }

  const resolution = width && height ? `${width}x${height}` : undefined;

  // ── Tags / Keywords ────────────────────────────────────────────────────────
  const tags: string[] = [];
  const kwMatch =
    html.match(/<meta[^>]+name="keywords"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+name="keywords"/i);
  if (kwMatch) {
    kwMatch[1].split(/,\s*/).forEach((t: string) => {
      const clean = t.trim().replace(/\s+wallpaper$/i, "").trim();
      if (clean && clean.length < 50) tags.push(clean);
    });
  }

  // ── Category ──────────────────────────────────────────────────────────────
  let category: string | undefined;
  const catMatch = html.match(/\/en\/category\/([^/"?#]+)/i);
  if (catMatch) category = decodeURIComponent(catMatch[1]).replace(/-/g, " ");

  // ── File size ─────────────────────────────────────────────────────────────
  let fileSize: string | undefined;
  const fsMatch = html.match(/\b(\d+(?:\.\d+)?\s*(?:KB|MB|GB))\b/i);
  if (fsMatch) fileSize = fsMatch[1];

  return {
    id: slug,
    slug,
    title: title || slug.replace(/-/g, " "),
    pageUrl,
    thumbnailUrl,
    imageUrl,
    downloadUrl,
    ...(width && { width }),
    ...(height && { height }),
    ...(resolution && { resolution }),
    ...(fileSize && { fileSize }),
    ...(tags.length && { tags }),
    ...(category && { category }),
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugParam = searchParams.get("slug") || "";
    const urlParam = searchParams.get("url") || "";

    let pageUrl = "";

    if (urlParam) {
      pageUrl = urlParam.startsWith("http")
        ? urlParam
        : `https://www.peakpx.com${urlParam}`;
    } else if (slugParam) {
      pageUrl = slugParam.startsWith("http")
        ? slugParam
        : slugParam.startsWith("/")
        ? `https://www.peakpx.com${slugParam}`
        : `https://www.peakpx.com/en/${slugParam}`;
    } else {
      return NextResponse.json(
        {
          error: "Missing required param.",
          usage: [
            "?slug=hd-wallpaper-desktop-xxxxx",
            "?url=https://www.peakpx.com/en/hd-wallpaper-desktop-xxxxx",
          ],
        },
        { status: 400 }
      );
    }

    const html = await fetchPeakPX(pageUrl);
    const wallpaper = parseWallpaperDetail(html, pageUrl);

    return NextResponse.json({
      success: true,
      wallpaper,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/wallpaper] ERROR:", msg);
    return NextResponse.json(
      { error: "Wallpaper fetch failed", message: msg },
      { status: 500 }
    );
  }
}
