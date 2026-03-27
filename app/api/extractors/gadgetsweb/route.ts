import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decode(value: string | undefined): string {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('ascii');
  } catch {
    return '';
  }
}

function rot13(value: string): string {
  return value.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

function extractBase64Payload(html: string): string | null {
  // Try multiple function call patterns since the site may change them
  const patterns = [
    /stck\('o',\s*'([^']+)'/,
    /s\('o',\s*'([^']+)'/,
    /var\s+o\s*=\s*'([^']+)'/,
    /atob\s*\(\s*'([^']+)'\s*\)/,
  ];
  for (const rx of patterns) {
    const m = rx.exec(html);
    if (m?.[1]) return m[1];
  }
  return null;
}

// Decode the 3-layer base64+rot13 payload used by cryptoinsights/gadgetsweb
function decodePayload(payload: string): any {
  try {
    const d1 = decode(payload);
    const d2 = decode(d1);
    const d3 = rot13(d2);
    const d4 = decode(d3);
    return JSON.parse(d4);
  } catch {
    return null;
  }
}

// Known intermediate redirect/link-generation domains
const REDIRECT_DOMAINS = [
  'hblinks.dad', 'techy.youdontcare.xyz', 'blogmura.com',
  'bonuscaf.com', 'cryptonewz.one', 'cryptoinsights.site',
  'linkxyz.site', 'filexyz.site',
];

// Cloud storage / CDN domains that ARE direct file hosts (don't follow these)
const DIRECT_HOSTS = [
  'hubcloud', 'hubdrive', 'vcloud', 'gofile.io', 'dropapk.to',
  'terabox', '1024tera', 'pixeldrain', 'gdrive', 'drive.google',
  'streamtape', 'mixdrop', 'upstream', 'doodstream',
];

function isDirectHost(url: string): boolean {
  return DIRECT_HOSTS.some(h => url.includes(h));
}

function isRedirectPage(url: string): boolean {
  return REDIRECT_DOMAINS.some(d => url.includes(d));
}

// Scrape a page and find a usable download/cloud link from it
async function extractLinkFromPage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': UA, 'Referer': pageUrl },
      redirect: 'follow',
    });

    // If the final URL after redirect is a direct file, return it
    const finalUrl = res.url || pageUrl;
    if (/\.(mkv|mp4|avi|zip|rar|mp3)(\?|$)/i.test(finalUrl)) return finalUrl;

    const html = await res.text();
    const $ = load(html);

    // Priority 1: Direct file link
    let found: string | null = null;
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (/\.(mkv|mp4|avi|zip|rar|mp3)(\?|$)/i.test(href)) {
        found = href.startsWith('//') ? 'https:' + href : href;
        return false;
      }
    });
    if (found) return found;

    // Priority 2: Recognized cloud/CDN host links
    const cloudSelectors = [
      'a[href*="hubcloud"]', 'a[href*="hubdrive"]', 'a[href*="vcloud"]',
      'a[href*="gofile.io"]', 'a[href*="pixeldrain"]', 'a[href*="1024tera"]',
      'a[href*="dropapk"]', 'a[href*="terabox"]',
    ];
    for (const sel of cloudSelectors) {
      const href = $(sel).first().attr('href');
      if (href) return href.startsWith('//') ? 'https:' + href : href;
    }

    // Priority 3: Any link with "Download Here" / "Download Now" text
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase().trim();
      if (!href.startsWith('http')) return;
      if (text.includes('download here') || text.includes('download now') || text.includes('click here to download')) {
        found = href;
        return false;
      }
    });
    if (found) return found;

    // Priority 4: window.location JS redirect
    const locMatch =
      html.match(/window\.location\.replace\(["']([^"']+)["']\)/i) ||
      html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i) ||
      html.match(/window\.location\.assign\(["']([^"']+)["']\)/i);
    if (locMatch?.[1]?.startsWith('http')) return locMatch[1];

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gadgetUrl = searchParams.get('url');
    const refererUrl = searchParams.get('referer');

    if (!gadgetUrl || !refererUrl) {
      return NextResponse.json({ success: false, error: 'Both url and referer are required' }, { status: 400 });
    }

    // ─── STEP 1: Fetch referer page to pick up cookies ────────────────────
    const refRes = await fetch(refererUrl, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      cache: 'no-store',
    });
    const refCookie = refRes.headers.get('set-cookie') || '';

    // ─── STEP 2: Hit gadgetsweb link (expect 302 redirect) ───────────────
    const gwRes = await fetch(gadgetUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': refererUrl,
        'Cookie': refCookie,
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    let intermediateUrl = gwRes.headers.get('location');

    // If no redirect, maybe the gadgetUrl itself IS the cryptoinsights page
    if (!intermediateUrl) {
      if (gwRes.status === 200) {
        // Possibly the page IS the intermediate page - try extracting from it
        const directHtml = await gwRes.text();
        if (
          directHtml.includes('Download Link Generated') ||
          directHtml.includes('Download Here') ||
          directHtml.includes('hubcloud') ||
          directHtml.includes('hubdrive')
        ) {
          const $ = load(directHtml);
          // Try to find the actual link
          const cloudSelectors = [
            'a[href*="hubcloud"]', 'a[href*="hubdrive"]', 'a[href*="vcloud"]',
            'a[href*="pixeldrain"]', 'a[href*="gofile"]', 'a[href*="1024tera"]',
          ];
          for (const sel of cloudSelectors) {
            const href = $(sel).first().attr('href');
            if (href) {
              return NextResponse.json({ success: true, originalUrl: gadgetUrl, directLink: href });
            }
          }
          // Find "Download Here" link
          let dlHere: string | null = null;
          $('a').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().toLowerCase().trim();
            if (href.startsWith('http') && (text.includes('download here') || text.includes('download now'))) {
              dlHere = href;
              return false;
            }
          });
          if (dlHere) {
            return NextResponse.json({ success: true, originalUrl: gadgetUrl, directLink: dlHere });
          }
        }
      }
      return NextResponse.json({
        success: false,
        error: 'Failed to extract intermediate URL',
        gwStatus: gwRes.status,
      });
    }

    const gwCookie = gwRes.headers.get('set-cookie') || '';
    const combinedCookie = [refCookie, gwCookie].filter(Boolean).join('; ').replace(/;\s*;/g, ';');

    // ─── STEP 3: Fetch the intermediate/cryptoinsights page ──────────────
    const cryptoRes = await fetch(intermediateUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': gadgetUrl,
        'Cookie': combinedCookie,
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    // If immediate redirect again (302 chain)
    const cryptoLocation = cryptoRes.headers.get('location');
    let html: string;
    let actualPage = intermediateUrl;

    if (cryptoLocation) {
      // Follow one more redirect
      const cr2 = await fetch(cryptoLocation, {
        headers: { 'User-Agent': UA, 'Referer': intermediateUrl, 'Cookie': combinedCookie },
        redirect: 'follow',
        cache: 'no-store',
      });
      html = await cr2.text();
      actualPage = cr2.url || cryptoLocation;
    } else {
      html = await cryptoRes.text();
    }

    // ─── STEP 4: Try to decode the encrypted payload ─────────────────────
    const encryptedPayload = extractBase64Payload(html);
    let directLink: string | null = null;

    if (encryptedPayload) {
      const decodedJson = decodePayload(encryptedPayload);
      if (decodedJson) {
        if (decodedJson.o) directLink = decode(decodedJson.o);
        else if (decodedJson.l) {
          directLink = decodedJson.l;
          if (directLink && directLink.length > 50 && !directLink.startsWith('http')) {
            directLink = decode(directLink);
          }
        }
      }
    }

    // ─── STEP 5: If link leads to another redirect page, follow it ────────
    if (directLink && isRedirectPage(directLink) && !isDirectHost(directLink)) {
      const deeper = await extractLinkFromPage(directLink);
      if (deeper) directLink = deeper;
    }

    // ─── STEP 6: If still no link, try scraping the page directly ─────────
    if (!directLink) {
      const scraped = await extractLinkFromPage(actualPage);
      if (scraped) directLink = scraped;
    }

    if (!directLink) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract direct link after all attempts',
        htmlSnippet: html.substring(0, 400),
      });
    }

    return NextResponse.json({
      success: true,
      originalUrl: gadgetUrl,
      directLink,
    });

  } catch (error: any) {
    console.error('Gadgetsweb extractor error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Extractor failed' }, { status: 500 });
  }
}
