import { NextRequest, NextResponse } from 'next/server';

// Only Prime Video has a standalone SPA on net52.cc at /pv/*
// Disney, Lionsgate etc use the SAME Netflix-style home with just an ott cookie

const PV_ORIGIN = 'https://pcmirror.cc';  // Prime Video SPA frontend origin
const BASE_URL = 'https://net52.cc';

let cachedCookies: string | null = null;
let cookieExpiry = 0;

async function getCookies(): Promise<string> {
  const now = Date.now();
  if (cachedCookies && now < cookieExpiry) return cachedCookies;
  
  try {
    const data = await fetch('https://anshu78780.github.io/json/cookies.json', { next: { revalidate: 3600 } });
    const j = await data.json();
    cachedCookies = j.cookies;
    cookieExpiry = now + 3600_000;
    return cachedCookies as string;
  } catch (e) {
    return '';
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }) {
  const p = await params;
  return handleProxy(req, p.proxy);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }) {
  const p = await params;
  return handleProxy(req, p.proxy);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

async function handleProxy(req: NextRequest, proxyPath: string[]) {
  const pathString = proxyPath.join('/');
  
  // Block internal Next.js API routes from being proxied
  if (pathString.startsWith('api/')) {
    return NextResponse.json({ error: 'Not from proxy' }, { status: 400 });
  }

  const baseCookies = await getCookies();
  const host = req.headers.get('host') || 'localhost:9090';
  
  // Determine OTT prefix for cookie routing
  const ottPrefix = proxyPath[0];
  let ottCookie = '';
  if (['pv', 'dp', 'lg'].includes(ottPrefix)) {
    ottCookie = `; ott=${ottPrefix}`;
  }

  // Determine Origin per platform
  const OTT_ORIGIN: Record<string, string> = {
    'pv': 'https://pcmirror.cc'
  };
  const platformOrigin = OTT_ORIGIN[ottPrefix] || BASE_URL;
  const refererBase = ottCookie ? `${platformOrigin}/${ottPrefix}/` : `${BASE_URL}/`;

  // FIX: Next.js params.proxy strips trailing slashes, causing a redirect loop
  // when the backend returns 301 to append a trailing slash. We must force it natively
  // for the base directories to avoid 301s from the backend.
  const isBaseDir = ['pv', 'dp', 'lg'].includes(pathString);
  const targetUrl = `${BASE_URL}/${pathString}${isBaseDir ? '/' : ''}${req.nextUrl.search}`;
  const fullCookies = baseCookies + ottCookie;

  const headers = new Headers({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': req.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': refererBase,
    'Cookie': fullCookies,
    'Origin': platformOrigin,
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'X-Requested-With': 'XMLHttpRequest',
  });

  if (req.headers.has('content-type')) {
    headers.set('Content-Type', req.headers.get('content-type')!);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',  // Manual intercept to rewrite Host
    cache: 'no-store',
  };

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const body = await req.arrayBuffer();
    init.body = body;
  }

  try {
    const res = await fetch(targetUrl, init);
    const contentType = res.headers.get('content-type') || '';
    
    // Forward select response headers
    const responseHeaders = new Headers();
    const skipHeaders = new Set(['content-encoding', 'transfer-encoding', 'content-length', 'set-cookie', 'server', 'x-powered-by']);
    res.headers.forEach((val, key) => {
      if (skipHeaders.has(key.toLowerCase())) return;
      responseHeaders.set(key, val);
    });
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    // Handle redirect responses — rewrite location to stay inside our proxy
    if ([301, 302, 307, 308].includes(res.status)) {
      const rawLocation = res.headers.get('location') || '/';
      const newLocation = rawLocation
        .replace(/https?:\/\/net[0-9]+\.cc/g, `http://${host}`)
        .replace(/https?:\/\/pcmirror\.cc/g, `http://${host}`);
      if (newLocation === req.nextUrl.href || newLocation === req.nextUrl.pathname) {
        return NextResponse.json({ error: 'Redirect loop prevented', location: rawLocation }, { status: 200 });
      }
      return NextResponse.redirect(new URL(newLocation, `http://${host}`), res.status);
    }

    const isTextContent = contentType.includes('text') || contentType.includes('javascript') || contentType.includes('json') || contentType.includes('xml');

    if (isTextContent) {
      let text = await res.text();
      
      // Rewrite URLs pointing to backend domains → our proxy
      text = text.replace(/https?:\/\/net[0-9]+\.cc/g, `http://${host}`);
      text = text.replace(/https?:\/\/pcmirror\.cc/g, `http://${host}`);

      responseHeaders.set('content-type', contentType || 'text/html; charset=utf-8');
      
      return new NextResponse(text, {
        status: res.status,
        headers: responseHeaders,
      });
    } else {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: responseHeaders,
      });
    }
  } catch (err: any) {
    console.error('Proxy error:', err);
    return NextResponse.json({ error: 'Proxy Fetch Failed', message: err.message, targetUrl }, { status: 502 });
  }
}
