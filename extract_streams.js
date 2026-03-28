/**
 * ┌────────────────────────────────────────────────────────┐
 * │  CINEMAHUB - Stream URL Extractor v4                   │
 * │  Sources: VidSrc, Rivestream, Abyss                   │
 * │  Strategy: Follow iframe chain + capture ALL requests  │
 * │  Uses Real Chrome to bypass Cloudflare                 │
 * └────────────────────────────────────────────────────────┘
 *
 * Usage (run from CINEMAHUB_BACKEND):
 *   node extract_streams.js vidsrc movie 385687
 *   node extract_streams.js vidsrc tv 1399 1 1
 *   node extract_streams.js rive movie 385687
 *   node extract_streams.js rive tv 1399 1 1
 *   node extract_streams.js abyss slug K8R6OOjS7
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const STREAM_WAIT_MS = 15000;
const TIMEOUT = 30000;

// ─── URL Builders ────────────────────────────────────────────────────────────

function buildUrl(source, type, id, season, episode) {
    if (source === 'vidsrc') {
        const base = 'https://vidsrc.icu/embed';
        if (type === 'movie') return `${base}/movie/${id}`;
        if (type === 'tv') return `${base}/tv/${id}/${season || 1}/${episode || 1}`;
    }
    if (source === 'rive') {
        const base = 'https://rivestream.org/embed';
        if (type === 'movie') return `${base}/movie?tmdb=${id}`;
        if (type === 'tv') return `${base}/tv?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`;
    }
    if (source === 'abyss') {
        return `https://abysscdn.com/v/${id}`;
    }
}

// ─── Stream Detector ─────────────────────────────────────────────────────────

function isStreamUrl(url) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false;
    return (
        url.includes('.m3u8') ||
        (url.includes('.mp4') && !url.includes('.html') && !url.includes('.js'))
    );
}

// ─── Core Extractor ──────────────────────────────────────────────────────────

async function extractStream(embedUrl, label) {
    console.log(`\n${'='.repeat(64)}`);
    console.log(`[${label}] → ${embedUrl}`);
    console.log('='.repeat(64));

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-popup-blocking',
            '--window-size=1280,800'
        ],
        defaultViewport: { width: 1280, height: 800 },
        ignoreDefaultArgs: ['--enable-automation']
    });

    const foundStreams = [];
    const seenUrls = new Set();
    const iframeSources = new Set();

    function captureUrl(url, from) {
        if (!url || seenUrls.has(url)) return;
        if (isStreamUrl(url)) {
            seenUrls.add(url);
            const t = url.includes('.m3u8') ? 'm3u8' : 'mp4';
            foundStreams.push({ url, type: t, from });
            console.log(`\n  ✓ ${t.toUpperCase()} [${from}]: ${url.substring(0, 120)}`);
        }
    }

    // ── Attach network logging to ANY new page/target ─────────────────────
    async function attachNetworkLogging(target, label) {
        try {
            const page = await target.page();
            if (!page) return;
            const c = await page.target().createCDPSession();
            await c.send('Network.enable');
            c.on('Network.requestWillBeSent', p => captureUrl(p.request.url, label));
            c.on('Network.responseReceived', p => {
                const ct = (p.response.headers['content-type'] || '').toLowerCase();
                if (ct.includes('mpegurl') || (ct.includes('video') && !ct.includes('html'))) {
                    captureUrl(p.response.url, `${label}-ct`);
                }
            });
        } catch (_) {}
    }

    browser.on('targetcreated', async t => {
        await attachNetworkLogging(t, 'new-target');
    });

    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // CDP on main page
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    client.on('Network.requestWillBeSent', p => {
        const url = p.request.url;
        captureUrl(url, 'main');
        // Track iframe candidates
        if (
            url.includes('vidsrc') || url.includes('cloudnestra') ||
            url.includes('rivestream') || url.includes('abysscdn')
        ) {
            console.log(`  [nav] ${url.substring(0, 100)}`);
        }
    });
    client.on('Network.responseReceived', p => {
        const ct = (p.response.headers['content-type'] || '').toLowerCase();
        if (ct.includes('mpegurl') || (ct.includes('video') && !ct.includes('html'))) {
            captureUrl(p.response.url, 'main-ct');
        }
    });

    // ── Patch all iframe creation to monitor src changes ─────────────────
    await page.evaluateOnNewDocument(() => {
        const origCreate = document.createElement.bind(document);
        document.createElement = function(tag) {
            const el = origCreate(tag);
            if (tag.toLowerCase() === 'iframe') {
                Object.defineProperty(el, 'src', {
                    set(v) {
                        console.log('[iframe-src]', v);
                        el.setAttribute('src', v);
                    },
                    get() { return el.getAttribute('src'); }
                });
            }
            return el;
        };
    });

    // Forward console messages so we see iframe-src logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.startsWith('[iframe-src]')) {
            console.log(`  [iframe detected] ${text}`);
        }
    });

    try {
        await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        const title = await page.title();
        console.log(`[*] Title: "${title}"`);
        console.log('[*] Waiting for iframes and streams...');
        await wait(5000);

        // Show all current frames
        const frames = page.frames();
        console.log(`\n[*] Active frames (${frames.length}):`);
        for (const f of frames) {
            const u = f.url();
            if (u && u !== 'about:blank') {
                console.log(`    → ${u}`);
                iframeSources.add(u);
            }
        }

        // Click center
        await page.mouse.click(640, 400);
        await wait(2000);
        await page.mouse.click(640, 400);
        await wait(2000);

        // Try play buttons in every frame
        for (const frame of page.frames()) {
            try {
                await frame.evaluate(() => {
                    const sels = [
                        'video', '.play-btn', '.play', '[class*=play]',
                        '.jw-display-icon-display', '.plyr__control--overlaid',
                        '.vjs-big-play-button', 'button', '#playBtn', '.btn-play'
                    ];
                    for (const s of sels) {
                        const el = document.querySelector(s);
                        if (el) { el.click(); return; }
                    }
                });
            } catch (_) {}
        }

        await wait(STREAM_WAIT_MS);

        // Final check for any iframes that appeared later
        const allIframes = await page.$$('iframe');
        for (const iframe of allIframes) {
            const src = await iframe.evaluate(el => el.src || el.getAttribute('src')).catch(() => '');
            if (src && !iframeSources.has(src)) {
                iframeSources.add(src);
                console.log(`\n[*] Late iframe detected: ${src}`);
            }
        }

    } catch (e) {
        console.error(`[!] Error: ${e.message}`);
    }

    await browser.close();

    // Results
    console.log('\n' + '─'.repeat(64));
    if (iframeSources.size > 0) {
        console.log('[*] Iframe chain:');
        for (const src of iframeSources) console.log(`    ${src}`);
    }

    console.log('');
    if (foundStreams.length === 0) {
        console.log('[-] No direct stream URLs captured.');
        console.log('    (Streams may be in blob: URLs or need user interaction)');
    } else {
        console.log(`[✓] ${foundStreams.length} stream(s) captured:`);
        foundStreams.forEach((s, i) => console.log(`  ${i + 1}. [${s.type.toUpperCase()}] ${s.url}`));
    }

    return { streams: foundStreams, iframes: [...iframeSources] };
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
    const [,, source = 'vidsrc', type = 'movie', id = '385687', season, episode] = process.argv;
    const url = buildUrl(source, type, id, season, episode);
    if (!url) { console.error('Unknown source/type. Use: vidsrc|rive|abyss  movie|tv  <tmdb_id>'); process.exit(1); }

    const result = await extractStream(url, source.toUpperCase());
    console.log('\n─── FINAL JSON ────────────────────────────────────────');
    console.log(JSON.stringify({ source, type, id, season, episode, ...result }, null, 2));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
