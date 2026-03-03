import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Extract domain from URL
    let domain = '';
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch (e) {
      console.error('Failed to parse URL:', e);
    }

    // Create form data for the scraper API
    const encodedUrl = encodeURIComponent(url);
    const infoData = `{"url":"${encodedUrl}","domain":"${domain}"}`;
    const formBody = `info=${infoData}`;

    // Make POST request to scraper API
    const response = await fetch('https://srv.badasserver1.com/get-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.8',
        'Origin': 'https://badassdownloader.com',
        'Referer': 'https://badassdownloader.com/',
        'Sec-Ch-Ua': '"Not-A.Brand";v="99", "Brave";v="145", "Chromium";v="145"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Gpc': '1',
        'Priority': 'u=1,i',
      },
      body: formBody,
    });

    const responseData = await response.json();

    // Transform response data to add download URLs
    if (responseData && typeof responseData === 'object' && responseData.sources?.mp4) {
      const downloadBaseUrl = 'https://srv.badasserver1.com/download?data=';
      
      for (const quality in responseData.sources.mp4) {
        if (responseData.sources.mp4[quality]?.src) {
          responseData.sources.mp4[quality].src = downloadBaseUrl + responseData.sources.mp4[quality].src;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stream data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
