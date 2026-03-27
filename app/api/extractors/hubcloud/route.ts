import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Known intermediate/redirect domains that have a "Download Here" button pointing to actual file
const INTERMEDIATE_DOMAINS = [
  'cryptoinsights.site',
  'cryptonewz.one',
  'bonuscaf.com',
  'hblinks.dad',
  'techy.youdontcare.xyz',
  'blogmura.com',
  'linkxyz.site',
  'filexyz.site',
];

function isIntermediatePage(url: string) {
  return INTERMEDIATE_DOMAINS.some(d => url.includes(d));
}

// Extract the actual download file URL from a "Download Link Generated" page
async function extractFromIntermediatePage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Referer': url },
      redirect: 'follow',
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Look for the "Download Here" button or any direct file link
    let found: string | null = null;

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase().trim();
      if (!href || href.startsWith('#') || href.includes('javascript')) return;

      // Direct file links (.mkv, .mp4, .zip, .rar, .mp3)
      if (/\.(mkv|mp4|avi|zip|rar|mp3|m4v|mov)(\?|$)/i.test(href)) {
        found = href;
        return false;
      }
      // "Download Here" type button
      if (text.includes('download here') || text.includes('download now') || text.includes('click here')) {
        if (href.startsWith('http')) {
          found = href;
          return false;
        }
      }
    });

    // Fallback: window.location redirect in JS
    if (!found) {
      const m = html.match(/window\.location(?:\.href|\.replace|\.assign)?\s*[=(]\s*["']([^"']+)["']/i);
      if (m?.[1]?.startsWith('http')) found = m[1];
    }

    return found;
  } catch {
    return null;
  }
}

// Fetch a page and extract the token bypass URL
async function getBypassUrl(pageHtml: string): Promise<string | null> {
  const $ = cheerio.load(pageHtml);

  // Try cheerio first
  let bypassUrl = $('a').filter((_, el) => {
    const h = $(el).attr('href') || '';
    return h.includes('.php?') && h.includes('token=');
  }).attr('href') || '';

  // Fallback regex
  if (!bypassUrl) {
    const m = pageHtml.match(/href=["'](https?:\/\/[^"']+\.php\?[^"']*token=[^"']+)["']/i);
    if (m) bypassUrl = m[1];
  }

  return bypassUrl || null;
}

// Extract filename from HTML
function extractFilename(html: string): string {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1]
      .replace(/HubDrive\s*\|?\s*/gi, '')
      .replace(/HubCloud\s*\|?\s*/gi, '')
      .replace(/\[HubCloud Server\]Are you sure\?/gi, '')
      .trim();
  }
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
    }

    const cleanUrl = url.trim();
    const isHubDrive = cleanUrl.includes('hubdrive');

    // ─── STEP 1: Fetch the initial HubCloud or HubDrive page ───────────────
    const step1Res = await fetch(cleanUrl, {
      headers: { 'User-Agent': UA, 'Referer': cleanUrl },
      redirect: 'follow',
    });

    if (!step1Res.ok) {
      return NextResponse.json({ success: false, error: `Step 1 failed: HTTP ${step1Res.status}` });
    }

    let html = await step1Res.text();
    let filename = extractFilename(html);
    const $ = cheerio.load(html);

    // ─── STEP 2: For HubDrive, find the embedded HubCloud link first ────────
    if (isHubDrive) {
      const hcLink = $('a').filter((_, el) => {
        const h = $(el).attr('href') || '';
        const t = $(el).text().toLowerCase();
        return h.includes('http') && (t.includes('hubcloud') || h.includes('hubcloud'));
      }).attr('href');

      if (hcLink) {
        // Fetch the hubcloud page embedded in hubdrive
        const hcRes = await fetch(hcLink, {
          headers: { 'User-Agent': UA, 'Referer': cleanUrl },
          redirect: 'follow',
        });
        html = await hcRes.text();
        if (!filename) filename = extractFilename(html);
      } else {
        // HubDrive might have token link directly
      }
    }

    // ─── STEP 3: Get the token bypass URL ───────────────────────────────────
    const bypassUrl = await getBypassUrl(html);

    if (!bypassUrl) {
      return NextResponse.json({
        success: false,
        error: 'No bypass token URL found on page',
        htmlSnippet: html.substring(0, 500),
      });
    }

    // ─── STEP 4: Follow the bypass URL ──────────────────────────────────────
    const bypassRes = await fetch(bypassUrl, {
      headers: { 'User-Agent': UA, 'Referer': cleanUrl },
      redirect: 'follow',
    });

    const bypassHtml = await bypassRes.text();
    const $b = cheerio.load(bypassHtml);

    // ─── STEP 5: Extract download links from bypass result page ─────────────
    const rawLinks: Array<{ name: string; link: string }> = [];

    $b('a').each((_, el) => {
      const text = $b(el).text().trim();
      let link = $b(el).attr('href') || '';
      if (!link || link.includes('javascript') || link === '#') return;
      if (link.startsWith('//')) link = 'https:' + link;
      if (!link.startsWith('http')) return;

      const lowerText = text.toLowerCase();
      if (
        lowerText.includes('download') ||
        lowerText.includes('server') ||
        lowerText.includes('instant') ||
        lowerText.includes('fsl') ||
        lowerText.includes('10gbps') ||
        lowerText.includes('pixe') ||
        lowerText.includes('gdrive') ||
        link.includes('.mkv') ||
        link.includes('.mp4')
      ) {
        let cleanName = text.replace(/Download \[|\]/g, '').replace('Download From ', '').trim();
        rawLinks.push({ name: cleanName || text, link });
      }
    });

    // Fallback: window.location in script
    if (rawLinks.length === 0) {
      const m =
        bypassHtml.match(/window\.location\.replace\(["']([^"']+)["']\)/i) ||
        bypassHtml.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i) ||
        bypassHtml.match(/window\.location\.assign\(["']([^"']+)["']\)/i);
      if (m?.[1]?.startsWith('http')) {
        rawLinks.push({ name: 'Direct Source', link: m[1] });
      }
    }

    // ─── STEP 6: For each raw link, follow if it's an intermediate page ─────
    const finalLinks: Array<{ name: string; link: string }> = [];

    for (const raw of rawLinks) {
      if (isIntermediatePage(raw.link)) {
        // It's a "Download Link Generated" page — follow it to get the real file link
        const realLink = await extractFromIntermediatePage(raw.link);
        if (realLink) {
          finalLinks.push({ name: raw.name, link: realLink });
        } else {
          // Couldn't resolve - keep original as fallback
          finalLinks.push(raw);
        }
      } else {
        finalLinks.push(raw);
      }
    }

    return NextResponse.json({
      success: true,
      originalUrl: cleanUrl,
      filename: filename || 'video.mkv',
      links: finalLinks,
    });

  } catch (error) {
    console.error('HubCloud extractor error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
