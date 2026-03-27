import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
};

// ─── Step A: Scrape leechpro.blog to get WP SafeLink URLs ─────────────────────
async function scrapeLeechPro(url: string): Promise<string[]> {
    const res = await fetch(url, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const host = new URL(url).hostname;
        if (href.startsWith('http') && !href.includes(host) && !href.includes('templatelens') && !href.includes('wordpress')) {
            links.push(href);
        }
    });
    return links;
}

// ─── Step B: Scrape episodes.modpro.blog to get WP SafeLink inner link ─────────
async function scrapeModPro(url: string): Promise<string[]> {
    const res = await fetch(url, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    const links: string[] = [];
    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        // modpro uses ?id= CDN links, but they seem obfuscated via CF
        // Also look for any external links that lead to shortener/host
        if (href.startsWith('http') && !href.includes('modpro.blog') && !href.includes('templatelens') && !href.includes('wordpress')) {
            links.push(href);
        }
    });

    // Also check for embedded episode links in ?id= format (CF Worker hosted)
    $('a[href*="?id="]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href && !links.includes(href)) links.push(href);
    });

    return links;
}

// ─── Step C: Full WP SafeLink bypass (unblockedgames / similar) ───────────────
// Flow: GET page → wait 3s → POST fd1 → POST fd2 → step3 HTML has s_343(key,val) 
//       and c.setAttribute("href","?go=xxx") → set cookie & GET ?go= → final URL
async function bypassWpSafeLink(url: string, referer: string): Promise<string | null> {
    let cookieJar = '';

    // STEP 1: GET
    const r1 = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
    const sc1 = r1.headers.get('set-cookie'); if (sc1) cookieJar = sc1;
    const t1 = await r1.text();
    const $1 = cheerio.load(t1);

    let fd1: Record<string, string> = {};
    $1('form input').each((_, el) => {
        const n = $1(el).attr('name'), v = $1(el).attr('value');
        if (n) fd1[n] = v || '';
    });
    if (Object.keys(fd1).length === 0) return null;
    const fa1 = $1('form').attr('action') || url;

    await delay(3500); // Site requires waiting ~3 seconds before submitting

    // STEP 2: POST fd1
    const r2 = await fetch(fa1, {
        method: 'POST', body: new URLSearchParams(fd1),
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': url, 'Cookie': cookieJar }
    });
    const sc2 = r2.headers.get('set-cookie'); if (sc2) cookieJar += '; ' + sc2;
    const t2 = await r2.text();
    const $2 = cheerio.load(t2);

    let fd2: Record<string, string> = {};
    $2('form input').each((_, el) => {
        const n = $2(el).attr('name'), v = $2(el).attr('value');
        if (n) fd2[n] = v || '';
    });
    if (Object.keys(fd2).length === 0) return null;
    const fa2 = $2('form').attr('action') || fa1;

    await delay(1000);

    // STEP 3: POST fd2
    const r3 = await fetch(fa2, {
        method: 'POST', body: new URLSearchParams(fd2),
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': fa1, 'Cookie': cookieJar }
    });
    const sc3 = r3.headers.get('set-cookie'); if (sc3) cookieJar += '; ' + sc3;
    const t3 = await r3.text();

    // KEY: Extract s_343(cookieKey, cookieVal) and c.setAttribute("href","?go=xxx")
    const s343 = t3.match(/s_343\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
    const goHref = t3.match(/c\.setAttribute\(["']href["']\s*,\s*["']([^"']+)["']\)/);

    if (!s343 || !goHref) {
        // Fallback: check if there's already a direct CDN link in t3
        const direct = extractCdnLink(t3);
        return direct;
    }

    const cookieKey = s343[1];
    const cookieVal = s343[2];
    const goUrl = goHref[1].startsWith('http') ? goHref[1] : new URL(goHref[1], url).href;

    // Set the cookie that unlocks the ?go= redirect
    cookieJar += `; ${cookieKey}=${encodeURIComponent(cookieVal)}`;

    await delay(1500);

    // STEP 4: GET ?go= with cookie → redirects to driveseed/video-seed
    const r4 = await fetch(goUrl, {
        headers: { ...HEADERS, 'Referer': fa2, 'Cookie': cookieJar },
        redirect: 'manual'
    });

    const loc4 = r4.headers.get('location');
    if (loc4) return loc4;

    const t4 = await r4.text();

    // HTML meta refresh
    const meta = t4.match(/content=["']\d+;\s*url=([^"']+)["']/i);
    if (meta) return meta[1];

    // window.location
    const winLoc = t4.match(/window\.location(?:\.replace|\.href)?\s*[=(]\s*["']([^"']+)["']/i);
    if (winLoc) return winLoc[1];

    // CDN link in page
    const direct2 = extractCdnLink(t4);
    if (direct2) return direct2;

    // Last resort: follow with redirect:follow
    const r4f = await fetch(goUrl, {
        headers: { ...HEADERS, 'Referer': fa2, 'Cookie': cookieJar },
        redirect: 'follow'
    });
    const finalUrl = r4f.url;
    if (finalUrl !== goUrl) return finalUrl;

    return null;
}

// ─── Step D: Extract actual download URL from driveseed/video-seed ────────────
async function bypassDriveSeed(url: string, referer: string): Promise<string | null> {
    const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
    let html = await res.text();
    let $ = cheerio.load(html);

    // Sometimes they use window.location.replace first
    const winLoc = html.match(/window\.location(?:\.replace|\.href|\.assign)?\s*[=(]\s*["']([^"']+)["']/i);
    if (winLoc) {
        let nextUrl = winLoc[1];
        if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, url).href;
        }
        if (nextUrl !== url) {
            const res2 = await fetch(nextUrl, { headers: { ...HEADERS, 'Referer': url } });
            html = await res2.text();
            $ = cheerio.load(html);
        }
    }

    // driveseed.org has INSTANT DOWNLOAD and CLOUD DOWNLOAD buttons
    const instantLink = $('.btn-danger').first().attr('href') || 
                        $('.btn-success').first().attr('href') ||
                        $('a:contains("INSTANT"), a:contains("Cloud")').first().attr('href');
                        
    if (instantLink && instantLink.startsWith('http')) {
        try {
            // cdn.video-leech.pro → 302 → video-seed.dev/?url=https://video-downloads.googleusercontent.com/...
            const rDir = await fetch(instantLink, { redirect: 'manual', headers: { ...HEADERS, 'Referer': url } });
            const loc = rDir.headers.get('location');
            if (loc) {
                const urlParam = loc.match(/[?&]url=(https?:\/\/[^&\s"']+)/);
                if (urlParam) return decodeURIComponent(urlParam[1]);
                return loc;
            }
        } catch (_) {}
        return instantLink;
    }

    // video-seed.dev has ?url=<raw_google_url> in the page source
    const videoSeedUrl = html.match(/\?url=(https?:\/\/[^\s"'&]+)/);
    if (videoSeedUrl) return decodeURIComponent(videoSeedUrl[1]);

    // Check for any direct video/file links (rare inline direct download)
    const directLink = extractCdnLink(html);
    if (directLink) return directLink;

    // Check for google content urls
    const googleContent = html.match(/https?:\/\/[a-z0-9-]+\.googleusercontent\.com\/[^\s"'<>]+/);
    if (googleContent) return googleContent[0];

    return url; // return driveseed page itself for user to click
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function extractCdnLink(html: string): string | null {
    const patterns = [
        /https?:\/\/[^\s"'<>]*driveseed\.org[^\s"'<>]*/,
        /https?:\/\/[^\s"'<>]*video-seed\.dev[^\s"'<>]*/,
        /https?:\/\/[^\s"'<>]*gofile\.io[^\s"'<>]*/,
        /https?:\/\/[^\s"'<>]*pixeldrain\.com[^\s"'<>]*/,
        /https?:\/\/[^\s"'<>]*terabox\.com[^\s"'<>]*/,
        /https?:\/\/[^\s"'<>]*1drv\.ms[^\s"'<>]*/,
    ];
    for (const p of patterns) {
        const m = html.match(p);
        if (m) return m[0].replace(/["'<>].*$/, '');
    }
    return null;
}

// ─── Main resolver ─────────────────────────────────────────────────────────────
async function resolveDownloadChain(url: string, referer: string): Promise<{
    success: boolean; resolvedUrl?: string; step?: string; error?: string;
}> {
    try {
        const hostname = new URL(url).hostname;

        // ── leechpro.blog: GET page → extract unblockedgames links → bypass each ──
        if (hostname.includes('leechpro.blog')) {
            const innerLinks = await scrapeLeechPro(url);
            if (innerLinks.length === 0) return { success: false, error: 'No inner links found in leechpro page' };

            // Try each option (Fast Server, G-Direct, OneDrive) in order
            for (const innerUrl of innerLinks) {
                const innerHost = new URL(innerUrl).hostname;
                if (innerHost.includes('unblockedgames') || innerHost.includes('techy') || innerHost.includes('tech2down')) {
                    const resolved = await bypassWpSafeLink(innerUrl, url);
                    if (resolved) {
                        // If resolved is driveseed/video-seed, extract from there too
                        if (resolved.includes('driveseed') || resolved.includes('video-seed')) {
                            const final = await bypassDriveSeed(resolved, innerUrl);
                            return { success: true, resolvedUrl: final || resolved, step: 'leechpro→unblockedgames→driveseed' };
                        }
                        return { success: true, resolvedUrl: resolved, step: 'leechpro→unblockedgames' };
                    }
                }
            }
            // Fallback: return first non-leechpro link for user to open
            return { success: true, resolvedUrl: innerLinks[0], step: 'leechpro→fallback' };
        }

        // ── episodes.modpro.blog: GET page → find links ──────────────────────────
        if (hostname.includes('modpro.blog')) {
            const innerLinks = await scrapeModPro(url);
            if (innerLinks.length > 0) {
                for (const innerUrl of innerLinks) {
                    const innerHost = new URL(innerUrl).hostname;
                    if (innerHost.includes('unblockedgames') || innerHost.includes('techy')) {
                        const resolved = await bypassWpSafeLink(innerUrl, url);
                        if (resolved) {
                            if (resolved.includes('driveseed') || resolved.includes('video-seed')) {
                                const final = await bypassDriveSeed(resolved, innerUrl);
                                return { success: true, resolvedUrl: final || resolved, step: 'modpro→unblockedgames→driveseed' };
                            }
                            return { success: true, resolvedUrl: resolved, step: 'modpro→unblockedgames' };
                        }
                    } else if (innerUrl.includes('driveseed') || innerUrl.includes('video-seed')) {
                        const final = await bypassDriveSeed(innerUrl, url);
                        return { success: true, resolvedUrl: final || innerUrl, step: 'modpro→driveseed' };
                    }
                }
                return { success: true, resolvedUrl: innerLinks[0], step: 'modpro→fallback' };
            }
        }

        // ── unblockedgames / WP SafeLink directly ────────────────────────────────
        if (hostname.includes('unblockedgames') || hostname.includes('tech2down') || hostname.includes('techy.in') || hostname.includes('animeflix.dad')) {
            const resolved = await bypassWpSafeLink(url, referer);
            if (resolved) {
                if (resolved.includes('driveseed') || resolved.includes('video-seed')) {
                    const final = await bypassDriveSeed(resolved, url);
                    return { success: true, resolvedUrl: final || resolved, step: 'unblockedgames→driveseed' };
                }
                return { success: true, resolvedUrl: resolved, step: 'unblockedgames' };
            }
        }

        // ── driveseed / video-seed: extract direct download ──────────────────────
        if (hostname.includes('driveseed') || hostname.includes('video-seed')) {
            const final = await bypassDriveSeed(url, referer);
            return { success: true, resolvedUrl: final || url, step: 'driveseed' };
        }

        // ── Generic: follow redirect chain ───────────────────────────────────────
        const r = await fetch(url, { headers: { ...HEADERS, 'Referer': referer }, redirect: 'follow' });
        return { success: true, resolvedUrl: r.url, step: 'redirect-follow' };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    const referer = request.nextUrl.searchParams.get('referer') || '';

    if (!url) return NextResponse.json({ success: false, error: 'url parameter required' }, { status: 400 });

    const result = await resolveDownloadChain(url, referer);
    return NextResponse.json({ ...result, originalUrl: url });
}
