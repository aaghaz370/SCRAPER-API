import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';

// Apply Stealth Plugin to bypass Cloudflare
puppeteer.use(StealthPlugin());

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

export function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Fetch PeakPX HTML using Headless Puppeteer + Stealth Plugin
 * This realistically solves the Cloudflare Javascript/Managed Challenge.
 */
export async function fetchPeakPXPuppeteer(url: string, waitForSelector?: string): Promise<string> {
  let browser = null;
  try {
    // Basic setup matching Vercel Serverless environment + Local fallback
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless === 'new' ? true : chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Set a realistic UA
    await page.setUserAgent(randomUA());
    
    // Enable request interception to save bandwidth and speed up if needed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (rt === 'image' || rt === 'stylesheet' || rt === 'font' || rt === 'media') {
        req.abort(); // don't load heavy assets, only DOM and JS for CF
      } else {
        req.continue();
      }
    });

    // Go to the target URL
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait until the Cloudflare check passes
    // PeakPX usually loads `<html lang="en">` or specific elements when bypass is successful
    // CF challenge has `<title>Just a moment...</title>`
    try {
      await page.waitForFunction(
        () => {
          return !document.title.includes("Just a moment") && !document.title.includes("Attention Required");
        },
        { timeout: 15000 }
      );
    } catch(e) {
      console.log("Timeout waiting for CF bypass, continuing anyway...");
    }

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      } catch(e) {}
    }

    // Attempt to wait briefly for JS rendering
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    return html;
  } catch (err: any) {
    throw new Error(`Puppeteer Fetch Error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ─── Parsers ──────────────────────────────────────────

export interface WallpaperItem {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  resolution?: string;
  tags?: string[];
}

export function parseWallpaperGrid(html: string): WallpaperItem[] {
  const items: WallpaperItem[] = [];
  const seen = new Set<string>();

  function addItem(href: string, thumbnailUrl: string, title: string, width?: number, height?: number) {
    if (!thumbnailUrl && !href) return;
    const slugMatch = href.match(/\/en\/(?:hd-wallpaper(?:-desktop)?-)?(.+?)(?:\?|#|$)/i) || href.match(/\/([^/]+)(?:\?|#|$)/);
    const slug = slugMatch ? slugMatch[1] : href.replace(/\//g, "-").replace(/^-/, "");

    if (seen.has(slug)) return;
    seen.add(slug);

    const imageUrl = thumbnailUrl
      ? thumbnailUrl.replace(/-thumbnail(\.\w+)$/, "$1").replace(/\/thumbnail\//g, "/full/").replace(/\?.*$/, "")
      : "";

    const pageUrl = href.startsWith("http") ? href : `https://www.peakpx.com${href}`;

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

  // <figure> matching from raw scrape
  const figures = html.match(/<figure[\s\S]*?<\/figure>/gi) || [];
  for (const fig of figures) {
    const hrefMatch = fig.match(/href="([^"]+)"/i);
    if (!hrefMatch) continue;
    const imgMatch = fig.match(/data-src="([^"]+)"/i) || fig.match(/<img[^>]+src="([^"]+)"/i);
    const altMatch = fig.match(/alt="([^"]*)"/i);
    const wMatch = fig.match(/\bwidth="(\d+)"/i);
    const hMatch = fig.match(/\bheight="(\d+)"/i);
    addItem(hrefMatch[1], imgMatch ? imgMatch[1] : "", altMatch ? altMatch[1].replace(/ wallpaper$/i, "").trim() : "", wMatch ? parseInt(wMatch[1]) : undefined, hMatch ? parseInt(hMatch[1]) : undefined);
  }

  return items;
}

export function parsePagination(html: string, currentPage: number): { totalPages: number; hasNextPage: boolean } {
  const pageNums: number[] = [currentPage];
  const pageQueryRegex = /[?&]page=(\d+)/gi;
  const pagePathRegex = /\/page\/(\d+)/gi;
  let m;
  while ((m = pageQueryRegex.exec(html)) !== null) pageNums.push(parseInt(m[1]));
  while ((m = pagePathRegex.exec(html)) !== null) pageNums.push(parseInt(m[1]));
  const maxPage = Math.max(...pageNums);
  const hasNextPage = html.includes('rel="next"') || html.includes('class="next"') || html.includes("next-page") || maxPage > currentPage;
  return { totalPages: maxPage, hasNextPage };
}
