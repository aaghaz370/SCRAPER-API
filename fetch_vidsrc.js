const https = require('https');
const http = require('http');

function req(url, h, followRedirect = true) {
    return new Promise((res, rej) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, { headers: h }, r => {
            if (followRedirect && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                return req(r.headers.location, h, followRedirect).then(res).catch(rej);
            }
            let d = ''; r.on('data', x => d += x);
            r.on('end', () => res({ s: r.statusCode, d, headers: r.headers }));
        }).on('error', rej);
    });
}

const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://vidsrc.icu/'
};

(async () => {
    // Step 1: Fetch the vidsrcme embed page
    console.log('\n[1] Fetching vidsrcme embed page...');
    const r1 = await req('https://vidsrcme.vidsrc.icu/embed/movie?tmdb=385687&autoplay=1&ds_lang=en', hdrs);
    console.log('Status:', r1.s);

    // Extract ALL data-hash values
    const hashRe = /data-hash="([^"]+)"/g;
    let m;
    const hashes = [];
    while ((m = hashRe.exec(r1.d)) !== null) hashes.push(m[1]);

    // Also try to find server names alongside
    const serverRe = /data-hash="([^"]+)"[^>]*>\s*<[^>]+id="name"[^>]*>([^<]+)/g;
    const servers = [];
    while ((m = serverRe.exec(r1.d)) !== null) {
        servers.push({ hash: m[1], name: m[2].trim() });
    }

    console.log('\n[2] Found hashes:', hashes.length);
    hashes.forEach((h2, i) => console.log(`  Server ${i+1}: ${h2}`));

    if (servers.length > 0) {
        console.log('\n  Servers with names:');
        servers.forEach(s => console.log(`  - ${s.name}: ${s.hash}`));
    }

    // Step 2: For each hash, fetch cloudnestra to get the player iframe & stream
    for (const hash of hashes.slice(0, 2)) { // Test first 2 servers
        console.log(`\n[3] Following cloudnestra hash: ${hash}`);
        try {
            const r2 = await req(`https://cloudnestra.com/rcp/${hash}`, {
                ...hdrs,
                'Referer': 'https://vidsrcme.vidsrc.icu/'
            });
            console.log('Status:', r2.s);

            // Look for stream URLs in the page
            const m3u8Re = /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g;
            const mp4Re = /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g;
            const m3u8s = [...r2.d.matchAll(m3u8Re)].map(x => x[0]);
            const mp4s = [...r2.d.matchAll(mp4Re)].map(x => x[0]);

            if (m3u8s.length > 0) console.log('  M3U8 found:', m3u8s);
            if (mp4s.length > 0) console.log('  MP4 found:', mp4s);

            // Look for further iframe src
            const iframeRe = /src=["']([^"']+)["']/g;
            const iframes = [];
            while ((m = iframeRe.exec(r2.d)) !== null) {
                const src = m[1];
                if (!src.startsWith('#') && !src.startsWith('data:') && src.includes('http')) {
                    iframes.push(src);
                }
            }
            if (iframes.length > 0) {
                console.log('  Iframe URLs found:', iframes);
            }

            // Print body snippet
            console.log('  Body (first 1500):', r2.d.substring(0, 1500));
        } catch (e) {
            console.error('  Error:', e.message);
        }
    }
})();
