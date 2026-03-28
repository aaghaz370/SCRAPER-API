/**
 * ┌────────────────────────────────────────────────────────┐
 * │  CINEMAHUB - VidSrc + Rivestream Smart Extractor       │
 * │  Follows: vidsrc → vidsrcme → cloudnestra → m3u8       │
 * └────────────────────────────────────────────────────────┘
 * Usage:
 *   node stream_extractor.js [tmdb_id] [type=movie|tv] [season] [episode]
 *   Example: node stream_extractor.js 385687
 *   Example: node stream_extractor.js 1399 tv 1 1
 */

const https = require('https');
const http = require('http');

// ─── HTTP helper ────────────────────────────────────────────────────────────
function httpGet(url, headers = {}, followRedirects = true, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        if (maxRedirects === 0) return reject(new Error('Too many redirects'));
        const lib = url.startsWith('https') ? https : http;
        try {
            lib.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
                    'Accept-Language': 'en-US,en;q=0.9',
                    ...headers
                }
            }, (res) => {
                if (followRedirects && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const loc = res.headers.location;
                    const nextUrl = loc.startsWith('http') ? loc : new URL(loc, url).toString();
                    return httpGet(nextUrl, headers, true, maxRedirects - 1).then(resolve).catch(reject);
                }
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers, url }));
            }).on('error', reject);
        } catch (e) { reject(e); }
    });
}

// ─── Regex helpers ──────────────────────────────────────────────────────────
function extractAll(str, re) {
    const results = [];
    let m;
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = r.exec(str)) !== null) results.push(m);
    return results;
}

function findStreams(text) {
    const streams = [];
    const m3u8 = extractAll(text, /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/);
    const mp4 = extractAll(text, /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/);
    m3u8.forEach(m => streams.push({ url: m[0], type: 'm3u8' }));
    mp4.forEach(m => {
        if (!m[0].includes('.html') && !m[0].includes('.js')) {
            streams.push({ url: m[0], type: 'mp4' });
        }
    });
    return streams;
}

// ─── VidSrc Extractor ───────────────────────────────────────────────────────
async function extractVidSrc(tmdbId, type = 'movie', season, episode) {
    const label = `[VIDSRC]`;
    console.log(`\n${label} TMDB ${tmdbId} (${type})`);
    const results = { servers: [], streams: [] };

    // Step 1: Get vidsrcme embed page
    let embedUrl = `https://vidsrcme.vidsrc.icu/embed/${type}?tmdb=${tmdbId}&autoplay=1&ds_lang=en`;
    if (type === 'tv' && season && episode) {
        embedUrl += `&season=${season}&episode=${episode}`;
    }

    console.log(`${label} [1] Fetching: ${embedUrl}`);
    const page1 = await httpGet(embedUrl, { 'Referer': 'https://vidsrc.icu/' });
    console.log(`${label} Status: ${page1.status}`);

    // Extract hashes from data-hash attributes
    const hashMatches = extractAll(page1.body, /data-hash="([^"]+)"/);
    const hashes = hashMatches.map(m => m[1]);
    console.log(`${label} [2] Found ${hashes.length} server hash(es)`);

    // Also try the sources.js endpoint (different VidSrc approach)
    // Get the data-id from the page
    const idMatch = /data-id="([^"]+)"/.exec(page1.body);
    const vidId = idMatch ? idMatch[1] : null;
    if (vidId) {
        console.log(`${label}     Video ID: ${vidId}`);
        // Try direct sources API
        try {
            const srcApi = await httpGet(
                `https://vidsrcme.vidsrc.icu/getSources?id=${vidId}`,
                { 'Referer': embedUrl, 'X-Requested-With': 'XMLHttpRequest' }
            );
            if (srcApi.status === 200 && srcApi.body.includes('{')) {
                const srcData = JSON.parse(srcApi.body);
                console.log(`${label}     Sources API response:`, srcData);
            }
        } catch (e) {
            // Sources API may not exist on this variant
        }
    }

    // Step 2: Follow each cloudnestra hash
    for (let i = 0; i < Math.min(hashes.length, 3); i++) {
        const hash = hashes[i];
        const serverName = `Server ${i + 1}`;
        console.log(`\n${label} [3] Following ${serverName}: cloudnestra.com/rcp/${hash.substring(0, 30)}...`);
        results.servers.push({ name: serverName, hash });

        try {
            const cnPage = await httpGet(
                `https://cloudnestra.com/rcp/${hash}`,
                { 'Referer': embedUrl }
            );
            console.log(`${label}     Cloudnestra status: ${cnPage.status}, url: ${cnPage.url}`);

            // Check for streams directly
            const directStreams = findStreams(cnPage.body);
            if (directStreams.length > 0) {
                console.log(`${label}     ✓ Streams found:`, directStreams.map(s => s.url));
                results.streams.push(...directStreams);
                continue;
            }

            // Look for further iframes
            const iframeSrcs = extractAll(cnPage.body, /(?:src|href)=["']([^"']*(?:embed|player|rcp|stream)[^"']*)["']/);
            const scriptUrls = extractAll(cnPage.body, /["'](https?:\/\/[^"']+\.js[^"']*)["']/);

            if (iframeSrcs.length > 0) {
                for (const [, iSrc] of iframeSrcs) {
                    const fullSrc = iSrc.startsWith('//') ? 'https:' + iSrc : iSrc;
                    console.log(`${label}     Following iframe: ${fullSrc}`);
                    try {
                        const iPage = await httpGet(fullSrc, { 'Referer': `https://cloudnestra.com/` });
                        console.log(`${label}     Iframe status: ${iPage.status}`);
                        const iStreams = findStreams(iPage.body);
                        if (iStreams.length > 0) {
                            console.log(`${label}     ✓ Iframe streams:`, iStreams.map(s => s.url));
                            results.streams.push(...iStreams);
                        }
                        // Print body snippet for inspection
                        console.log(`${label}     Body preview: ${iPage.body.substring(0, 500)}`);
                    } catch (e) {
                        console.log(`${label}     Iframe error: ${e.message}`);
                    }
                }
            } else {
                // Print cloudnestra body snippet
                console.log(`${label}     Body: ${cnPage.body.substring(0, 800)}`);
            }
        } catch (e) {
            console.log(`${label}     Hash ${i+1} error: ${e.message}`);
        }
    }

    return results;
}

// ─── Rivestream Extractor ───────────────────────────────────────────────────
async function extractRivestream(tmdbId, type = 'movie', season, episode) {
    const label = `[RIVE]`;
    console.log(`\n${label} TMDB ${tmdbId} (${type})`);
    const results = { servers: [], streams: [] };

    let embedUrl = `https://rivestream.org/embed/${type}?tmdb=${tmdbId}`;
    if (type === 'tv' && season && episode) {
        embedUrl += `&season=${season}&episode=${episode}`;
    }

    console.log(`${label} [1] Fetching: ${embedUrl}`);
    const page = await httpGet(embedUrl);
    console.log(`${label} Status: ${page.status}`);

    // Check for direct streams
    const streams = findStreams(page.body);
    if (streams.length > 0) {
        console.log(`${label} ✓ Direct streams:`, streams.map(s => s.url));
        results.streams = streams;
        return results;
    }

    // Look for API calls in script blocks
    const apiCalls = extractAll(page.body, /["'](https?:\/\/[^"']*(?:stream|source|m3u8|hls|mp4|media)[^"']*)["']/);
    console.log(`${label} Potential API URLs:`, apiCalls.map(m => m[1]).slice(0, 10));

    // Try Rivestream's direct API
    const apiUrls = [
        `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${tmdbId}`,
        `https://rivestream.org/api/source/movie/${tmdbId}`,
        `https://rivestream.org/api/v2/movie/${tmdbId}`,
    ];

    for (const url of apiUrls) {
        try {
            const r = await httpGet(url, { 'Referer': 'https://rivestream.org/' });
            console.log(`${label} API ${url}: ${r.status}`);
            if (r.status === 200) {
                console.log(`${label} Response: ${r.body.substring(0, 500)}`);
                const apiStreams = findStreams(r.body);
                if (apiStreams.length > 0) {
                    results.streams.push(...apiStreams);
                }
            }
        } catch (e) {
            console.log(`${label} API error: ${e.message}`);
        }
    }

    // Print body snippet for analysis
    const bodyStart = page.body.indexOf('<body');
    console.log(`${label} Page body (first 2000): ${page.body.substring(bodyStart > 0 ? bodyStart : 0, (bodyStart > 0 ? bodyStart : 0) + 2000)}`);

    return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    const [,, tmdbId = '385687', type = 'movie', season, episode] = process.argv;

    // Run both extractors
    const [vsResult, riveResult] = await Promise.allSettled([
        extractVidSrc(tmdbId, type, season, episode),
        extractRivestream(tmdbId, type, season, episode)
    ]);

    console.log('\n' + '═'.repeat(64));
    console.log('RESULTS SUMMARY');
    console.log('═'.repeat(64));

    const vs = vsResult.status === 'fulfilled' ? vsResult.value : { streams: [], error: vsResult.reason?.message };
    const rive = riveResult.status === 'fulfilled' ? riveResult.value : { streams: [], error: riveResult.reason?.message };

    console.log('\nVidSrc streams:', vs.streams?.length || 0);
    vs.streams?.forEach((s, i) => console.log(`  ${i+1}. [${s.type}] ${s.url}`));

    console.log('\nRivestream streams:', rive.streams?.length || 0);
    rive.streams?.forEach((s, i) => console.log(`  ${i+1}. [${s.type}] ${s.url}`));

    const allStreams = [
        ...(vs.streams || []).map(s => ({ ...s, source: 'vidsrc' })),
        ...(rive.streams || []).map(s => ({ ...s, source: 'rivestream' }))
    ];

    console.log('\n─── FINAL JSON ────────────────────────────────────────');
    console.log(JSON.stringify({ tmdbId, type, season, episode, allStreams }, null, 2));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
