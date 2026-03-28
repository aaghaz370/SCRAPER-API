const http = require('http');
const https = require('https');

const CDN = "net52.cc"; // CORRECT domain (net51.cc gives 404, net52.cc gives 200)
const movieId = "81713690";
const PORT = 3456;

function httpsGet(url, reqHeaders) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: reqHeaders,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function setup() {
  const { cookies } = await (await fetch('https://anshu78780.github.io/json/cookies.json')).json();
  console.log('✅ Cookies loaded');

  const baseHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Cookie": cookies,
    "Referer": "https://net22.cc/",
    "X-Requested-With": "XMLHttpRequest",
  };

  const playJson = await (await fetch("https://net22.cc/play.php", {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Referer": "https://net20.cc/" },
    body: `id=${movieId}`,
  })).json();
  const hash = playJson.h;
  console.log('✅ Hash obtained');

  const ts = Date.now();
  const playlistArr = JSON.parse(await (await fetch(
    `https://net52.cc/playlist.php?id=${movieId}&tm=${ts}&h=${encodeURIComponent(hash)}`,
    { headers: { ...baseHeaders, "Referer": "https://net52.cc/" } }
  )).text());

  const sources = playlistArr[0].sources;
  // Pick Mid HD (720p) as default — most stable
  const best = sources.find(s => s.file.includes('q=720p')) || sources.find(s => !s.file.includes('q=')) || sources[0];
  const m3u8Url = `https://${CDN}${best.file}`;
  console.log('✅ M3U8 URL:', m3u8Url);

  const cdnHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Cookie": cookies,
    "Referer": `https://${CDN}/`,
    "Origin": `https://${CDN}`,
  };

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    console.log('→', req.url.substring(0, 80));

    try {
      // ── HTML player page ─────────────────────────────────────────
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Viking Wolf — Stream</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Segoe UI', sans-serif; color: #fff; }
    h1 { font-size: 1.4rem; margin-bottom: 16px; }
    video { width: 94vw; max-width: 1100px; border-radius: 10px; background: #000; box-shadow: 0 0 40px rgba(0,0,0,0.8); }
    p { margin-top: 12px; font-size: 0.8rem; color: #888; }
  </style>
</head>
<body>
  <h1>🎬 Viking Wolf — net22.cc</h1>
  <video id="v" controls autoplay></video>
  <p>CDN: ${CDN} | Via local proxy</p>
  <script>
    const v = document.getElementById('v');
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
      hls.loadSource('/stream.m3u8');
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { console.log('Manifest parsed, playing...'); v.play(); });
      hls.on(Hls.Events.ERROR, (e, d) => { console.error('HLS Error:', d.type, d.details); });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = '/stream.m3u8';
      v.play();
    } else {
      document.body.innerHTML += '<p style="color:red">HLS not supported in this browser</p>';
    }
  </script>
</body>
</html>`);
      }

      // ── /stream.m3u8 → fetch real M3U8 and rewrite URLs ──────────
      if (req.url === '/stream.m3u8') {
        const r = await httpsGet(m3u8Url, cdnHeaders);
        console.log('  M3U8 fetch status:', r.statusCode, '| size:', r.body.length);
        let m3u8Text = r.body.toString('utf8');
        console.log('  Raw M3U8 (first 300):', m3u8Text.substring(0, 300));

        // Rewrite ALL relative /hls/ paths to go through our /proxy
        m3u8Text = m3u8Text.replace(/^(\/hls\/[^\n\r]+)/gm, path => `/proxy?url=${encodeURIComponent(path)}`);
        // Rewrite any absolute CDN URLs
        m3u8Text = m3u8Text.replace(/(https?:\/\/net5[0-9]+\.cc)(\/[^\n\r]+)/g, (_, _h, path) => `/proxy?url=${encodeURIComponent(path)}`);

        res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
        return res.end(m3u8Text);
      }

      // ── /proxy?url=PATH → proxy any CDN resource ─────────────────
      if (req.url.startsWith('/proxy')) {
        const urlPath = new URL(req.url, 'http://localhost').searchParams.get('url') || '';
        const target = urlPath.startsWith('http') ? urlPath : `https://${CDN}${urlPath}`;

        const r = await httpsGet(target, cdnHeaders);
        let body = r.body;
        const ct = r.headers['content-type'] || 'application/octet-stream';

        // If child m3u8, also rewrite
        if (ct.includes('mpegurl') || urlPath.includes('.m3u8')) {
          let txt = body.toString('utf8');
          txt = txt.replace(/^(\/hls\/[^\n\r]+)/gm, p => `/proxy?url=${encodeURIComponent(p)}`);
          txt = txt.replace(/(https?:\/\/net5[0-9]+\.cc)(\/[^\n\r]+)/g, (_, _h, p) => `/proxy?url=${encodeURIComponent(p)}`);
          body = Buffer.from(txt);
        }

        res.writeHead(r.statusCode, { 'Content-Type': ct, 'Content-Length': body.length });
        return res.end(body);
      }

      res.writeHead(404); res.end('Not found');

    } catch (e) {
      console.error('Proxy error:', e.message);
      res.writeHead(500); res.end(e.message);
    }
  });

  server.listen(PORT, () => {
    console.log('\n══════════════════════════════════════════════');
    console.log('  🚀 Proxy Server READY! CDN: ' + CDN);
    console.log('══════════════════════════════════════════════');
    console.log(`  🌐 Browser → http://localhost:${PORT}/`);
    console.log(`  📺 VLC    → http://localhost:${PORT}/stream.m3u8`);
    console.log('══════════════════════════════════════════════');
  });
}

setup().catch(e => console.error("STARTUP ERROR:", e.message));
