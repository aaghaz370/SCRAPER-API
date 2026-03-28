/**
 * Shared PeakPX fetch utilities — Cloudflare bypass with multiple strategies.
 * Used across all /api/peakpx/* routes.
 * 
 * Strategy:
 *  1. Edge Runtime (deployed on Vercel) runs on Cloudflare's own CDN — the
 *     primary bypass. This works automatically after deployment.
 *  2. Realistic browser headers + multiple referers as secondary bypass.
 *  3. Environment variable PEAKPX_CF_CLEARANCE lets you inject a valid
 *     cf_clearance cookie obtained from a real browser session.
 */

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

export function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Build realistic browser-like headers.
 * Optionally injects cf_clearance cookie from env for persistent bypass.
 */
export function buildHeaders(referer = "https://www.google.com/"): Record<string, string> {
  const ua = randomUA();

  // Build cookie string
  const cookieParts: string[] = [];

  // cf_clearance cookie — set via PEAKPX_CF_CLEARANCE env var
  // Get this from your browser DevTools > Application > Cookies after solving the challenge once
  const cfClearance = process.env.PEAKPX_CF_CLEARANCE;
  if (cfClearance) {
    cookieParts.push(`cf_clearance=${cfClearance}`);
  }

  const headers: Record<string, string> = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Referer": referer,
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referer.includes("peakpx") ? "same-origin" : "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Connection": "keep-alive",
  };

  if (cookieParts.length > 0) {
    headers["Cookie"] = cookieParts.join("; ");
  }

  return headers;
}

/**
 * Fetch a PeakPX page with multiple referer/strategy fallbacks.
 * Returns raw HTML string.
 */
export async function fetchPeakPX(url: string): Promise<string> {
  const referers = [
    "https://www.google.com/",
    "https://www.google.com/search?q=hd+wallpapers+peakpx",
    "https://www.peakpx.com/",
    "https://www.bing.com/search?q=hd+wallpapers",
    "https://duckduckgo.com/?q=hd+wallpapers",
  ];

  const errors: string[] = [];

  for (const referer of referers) {
    try {
      const res = await fetch(url, {
        headers: buildHeaders(referer),
        redirect: "follow",
      });

      const text = await res.text();

      if (!res.ok) {
        errors.push(`HTTP ${res.status} (ref: ${referer})`);
        continue;
      }

      // Detect Cloudflare challenge pages
      if (
        text.includes("Just a moment") ||
        text.includes("cf-browser-verification") ||
        text.includes("Checking if the site connection is secure") ||
        text.includes("challenge-platform")
      ) {
        errors.push(`CF challenge (ref: ${referer})`);
        continue;
      }

      // Verify we got actual page content
      if (!text.includes("<html")) {
        errors.push(`No HTML content (ref: ${referer})`);
        continue;
      }

      return text;
    } catch (e: any) {
      errors.push(`Fetch error (ref: ${referer}): ${e.message}`);
    }
  }

  throw new Error(
    `PeakPX: All bypass attempts failed.\n` +
    `Hint: Set PEAKPX_CF_CLEARANCE env var with your cf_clearance cookie.\n` +
    `Attempts: ${errors.join(" | ")}`
  );
}

// ─── Wallpaper Types ──────────────────────────────────────────────────────────

export interface WallpaperItem {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  thumbnailUrl: string;   // Preview/grid image URL (from CDN like w0.peakpx.com)
  imageUrl: string;       // Full-resolution image URL
  downloadUrl: string;    // Direct download link (no ads, no redirect)
  width?: number;
  height?: number;
  resolution?: string;    // e.g. "1920x1080"
  tags?: string[];
}

// ─── HTML Parsers ─────────────────────────────────────────────────────────────

/**
 * Parse wallpaper grid from any PeakPX listing page.
 * Handles both <figure>-based and <li>-based grid structures.
 */
export function parseWallpaperGrid(html: string): WallpaperItem[] {
  const items: WallpaperItem[] = [];
  const seen = new Set<string>();

  function addItem(
    href: string,
    thumbnailUrl: string,
    title: string,
    width?: number,
    height?: number
  ) {
    if (!thumbnailUrl && !href) return;
    const slugMatch =
      href.match(/\/en\/hd-wallpaper(?:-desktop)?-(.+?)(?:\?|#|$)/i) ||
      href.match(/\/hd-wallpaper(?:-desktop)?-(.+?)(?:\?|#|$)/i) ||
      href.match(/\/([^/]+)(?:\?|#|$)/);
    const slug = slugMatch ? slugMatch[1] : href.replace(/\//g, "-").replace(/^-/, "");

    if (seen.has(slug)) return;
    seen.add(slug);

    // Full-res: remove -thumbnail suffix if present
    const imageUrl = thumbnailUrl
      ? thumbnailUrl
          .replace(/-thumbnail(\.\w+)$/, "$1")
          .replace(/\/thumbnail\//g, "/full/")
          .replace(/\?.*$/, "")
      : "";

    const pageUrl = href.startsWith("http")
      ? href
      : `https://www.peakpx.com${href}`;

    items.push({
      id: slug,
      slug,
      title: title || slug.replace(/-/g, " "),
      pageUrl,
      thumbnailUrl,
      imageUrl: imageUrl || thumbnailUrl,
      downloadUrl: imageUrl || thumbnailUrl,
      ...(width && { width }),
      ...(height && { height }),
      ...(width && height ? { resolution: `${width}x${height}` } : {}),
    });
  }

  // ── Strategy 1: <figure> blocks ─────────────────────────────────────────────
  const figures = html.match(/<figure[\s\S]*?<\/figure>/gi) || [];
  for (const fig of figures) {
    const hrefMatch = fig.match(/href="([^"]+)"/i);
    if (!hrefMatch) continue;
    const imgMatch =
      fig.match(/data-src="([^"]+)"/i) || fig.match(/<img[^>]+src="([^"]+)"/i);
    const altMatch = fig.match(/alt="([^"]*)"/i);
    const wMatch = fig.match(/\bwidth="(\d+)"/i);
    const hMatch = fig.match(/\bheight="(\d+)"/i);
    addItem(
      hrefMatch[1],
      imgMatch ? imgMatch[1] : "",
      altMatch ? altMatch[1].replace(/ wallpaper$/i, "").trim() : "",
      wMatch ? parseInt(wMatch[1]) : undefined,
      hMatch ? parseInt(hMatch[1]) : undefined
    );
  }

  // ── Strategy 2: <li> items with PeakPX CDN images ──────────────────────────
  if (items.length === 0) {
    const lis = html.match(/<li[\s\S]*?<\/li>/gi) || [];
    for (const li of lis) {
      const hrefMatch = li.match(/href="(\/en\/[^"]+)"/i);
      const imgMatch = li.match(
        /(?:data-src|src)="(https?:\/\/w\d+\.peakpx\.com[^"]+)"/i
      );
      if (!hrefMatch || !imgMatch) continue;
      const altMatch = li.match(/alt="([^"]*)"/i);
      const wMatch = li.match(/\bwidth="(\d+)"/i);
      const hMatch = li.match(/\bheight="(\d+)"/i);
      addItem(
        hrefMatch[1],
        imgMatch[1],
        altMatch ? altMatch[1].replace(/ wallpaper$/i, "").trim() : "",
        wMatch ? parseInt(wMatch[1]) : undefined,
        hMatch ? parseInt(hMatch[1]) : undefined
      );
    }
  }

  // ── Strategy 3: any anchor with CDN img ────────────────────────────────────
  if (items.length === 0) {
    const anchorRegex = /<a[^>]+href="([^"]*hd-wallpaper[^"]*)"[\s\S]*?<img[^>]+(?:data-src|src)="(https?:\/\/w\d+\.peakpx\.com[^"]+)"[^>]*>/gi;
    let m;
    while ((m = anchorRegex.exec(html)) !== null) {
      const altMatch = m[0].match(/alt="([^"]*)"/i);
      addItem(
        m[1],
        m[2],
        altMatch ? altMatch[1].replace(/ wallpaper$/i, "").trim() : ""
      );
    }
  }

  return items;
}

/** Extract pagination info from a PeakPX listing page */
export function parsePagination(
  html: string,
  currentPage: number
): { totalPages: number; hasNextPage: boolean } {
  const pageNums: number[] = [currentPage];
  const pageQueryRegex = /[?&]page=(\d+)/gi;
  const pagePathRegex = /\/page\/(\d+)/gi;
  let m;
  while ((m = pageQueryRegex.exec(html)) !== null) pageNums.push(parseInt(m[1]));
  while ((m = pagePathRegex.exec(html)) !== null) pageNums.push(parseInt(m[1]));
  const maxPage = Math.max(...pageNums);
  const hasNextPage =
    html.includes('rel="next"') ||
    html.includes('class="next"') ||
    html.includes("next-page") ||
    maxPage > currentPage;
  return { totalPages: maxPage, hasNextPage };
}
