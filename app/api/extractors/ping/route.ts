import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return NextResponse.json({ success: false, error: 'No URL provided' });
    
    // We do a HEAD request to check if it's a file
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': url },
      redirect: 'follow'
    });
    
    const contentType = res.headers.get('content-type') || '';
    const contentLength = res.headers.get('content-length') || '0';
    const isHtml = contentType.includes('text/html');
    
    // If it's a valid download, it's typically NOT text/html, or it has a large content length
    // Wait, pixeldrain might return 'application/octet-stream' or 'video/...'
    const isValidFile = !isHtml && (parseInt(contentLength) > 100000 || contentType.includes('video') || contentType.includes('application/') || contentType.includes('octet-stream'));
    
    return NextResponse.json({
      success: true,
      isValidFile: isValidFile,
      contentType: contentType,
      contentLength: contentLength,
      status: res.status,
      finalUrl: res.url || url
    });
    
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
