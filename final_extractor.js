/**
 * ┌────────────────────────────────────────────────────────────────┐
 * │  CINEMAHUB - Final Stream Extractor                            │
 * │  Approach: Real Chrome → CDP deep monitoring on all targets    │
 * │  Covers: VidSrc (all 3 servers) + Rivestream                  │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   node final_extractor.js vidsrc movie 385687
 *   node final_extractor.js vidsrc tv 1399 1 1
 *   node final_extractor.js rive movie 385687
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function buildUrl(source, type, id, season, episode) {
    if (source === 'vidsrc') {
        // Hit the inner vidsrcme frame directly — skips the outer iframe level
        let url = `https://vidsrcme.vidsrc.icu/embed/${type}?tmdb=${id}&autoplay=1&ds_lang=en`;
        if (type === 'tv' && season && episode) url += `&season=${season}&episode=${episode}`;
        return url;
    }
    if (source === 'rive') {
        let url = `https://rivestream.org/embed/${type}?tmdb=${id}`;
        if (type === 'tv' && season && episode) url += `&season=${season}&episode=${episode}`;
        return url;
    }
}

function isStream(url) {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return false;
    return url.includes('.m3u8') || (url.includes('.mp4') && !url.includes('.html'));
}

async function extract(source, type, id, season, episode) {
    const embedUrl = buildUrl(source, type, id, season, episode);
    console.log(`\n${'='.repeat(64)}`);
    console.log(`[${source.toUpperCase()}] ${embedUrl}`);
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
            '--window-size=1280,800',
            '--autoplay-policy=no-user-gesture-required'
        ],
        defaultViewport: { width: 1280, height: 800 },
        ignoreDefaultArgs: ['--enable-automation']
    });

    const foundStreams = [];
    const seenUrls = new Set();
    const frameUrls = new Set();

    function capture(url, from) {
        if (!url || seenUrls.has(url)) return;
        if (isStream(url)) {
            seenUrls.add(url);
            const type2 = url.includes('.m3u8') ? 'm3u8' : 'mp4';
            foundStreams.push({ url, type: type2, from });
            console.log(`\n  ✅ ${type2.toUpperCase()} [${from}]: ${url.substring(0, 120)}`);
        }
    }

    // Monitor ALL new targets (tabs, iframes, etc.)
    browser.on('targetcreated', async (target) => {
        const tType = target.type();
        const tUrl = target.url();
        if (tUrl && tUrl !== 'about:blank' && tUrl !== 'about:newtab') {
            frameUrls.add(tUrl);
            console.log(`  [target:${tType}] ${tUrl.substring(0, 100)}`);
        }
        try {
            const p = await target.page();
            if (!p) return;
            const c = await p.target().createCDPSession();
            await c.send('Network.enable');
            c.on('Network.requestWillBeSent', ev => capture(ev.request.url, `target:${tType}`));
            c.on('Network.responseReceived', ev => {
                const ct = (ev.response.headers['content-type'] || '').toLowerCase();
                if (ct.includes('mpegurl') || (ct.includes('video') && !ct.includes('html'))) {
                    capture(ev.response.url, `target:${tType}-ct`);
                }
            });
        } catch (_) {}
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // CDP on main page
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    client.on('Network.requestWillBeSent', ev => {
        const u = ev.request.url;
        capture(u, 'main');
        if (!u.startsWith('data:') && !u.endsWith('.png') && !u.endsWith('.woff') &&
            !u.includes('google-analytics') && !u.includes('font')) {
            console.log(`  [req] ${u.substring(0, 110)}`);
        }
    });
    client.on('Network.responseReceived', ev => {
        const ct = (ev.response.headers['content-type'] || '').toLowerCase();
        if (ct.includes('mpegurl') || (ct.includes('video') && !ct.includes('html'))) {
            capture(ev.response.url, 'main-ct');
        }
    });

    try {
        await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        console.log(`\n[*] Title: "${await page.title()}"`);

        // Wait for initial render + autoplay
        await wait(8000);

        // Click to trigger any play button
        await page.mouse.click(640, 400);
        await wait(2000);

        // List all frames
        const frames = page.frames();
        console.log(`\n[*] Live frames (${frames.length}):`);
        for (const f of frames) {
            const fu = f.url();
            if (fu && fu !== 'about:blank') {
                console.log(`    → ${fu}`);
                frameUrls.add(fu);
            }
        }

        // Try clicking server buttons if visible (vidsrc has multiple servers)
        const servers = await page.$$('.server, .source, [data-hash]');
        if (servers.length > 0) {
            console.log(`\n[*] Found ${servers.length} server button(s), clicking...`);
            for (const btn of servers) {
                await btn.click().catch(() => {});
                await wait(5000); // Wait for stream to start per server
            }
        }

        // Try play buttons in all frames
        for (const frame of page.frames()) {
            try {
                await frame.evaluate(() => {
                    const sels = ['video', '.play-btn', '.play', '.plyr__control--overlaid',
                        '.jw-display-icon-display', '.vjs-big-play-button', 'button'];
                    for (const s of sels) {
                        const el = document.querySelector(s);
                        if (el && el.offsetWidth > 0) { el.click(); return; }
                    }
                }).catch(() => {});
            } catch (_) {}
        }

        // Final wait
        await wait(8000);

        // Dump all iframes
        const iframes = await page.$$('iframe');
        if (iframes.length > 0) {
            console.log(`\n[*] Iframes on page (${iframes.length}):`);
            for (const ifr of iframes) {
                const src = await ifr.evaluate(el => el.src || el.getAttribute('src')).catch(() => '');
                if (src) console.log(`    → ${src}`);
            }
        }

    } catch (e) {
        console.error(`\n[!] Error: ${e.message}`);
    }

    await browser.close();

    console.log('\n' + '─'.repeat(64));
    console.log(`[✓] Streams found: ${foundStreams.length}`);
    foundStreams.forEach((s, i) => console.log(`  ${i + 1}. [${s.type.toUpperCase()}] ${s.url}`));

    return { source, type, id, streams: foundStreams, frameUrls: [...frameUrls] };
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const [,, source = 'vidsrc', type = 'movie', id = '385687', season, episode] = process.argv;
    const result = await extract(source, type, id, season, episode);

    console.log('\n─── FINAL JSON ────────────────────────────────────────');
    console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
