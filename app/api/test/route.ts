import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get URL from search params
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required. Use ?url=<your-url>' },
        { status: 400 }
      );
    }

    console.log('Target URL:', targetUrl);

    // Extract domain from URL
    let domain = '';
    try {
      const urlObj = new URL(targetUrl);
      domain = urlObj.hostname;
    } catch (e) {
      console.error('Failed to parse URL:', e);
    }

    console.log('Domain:', domain);

    // Create form data with both URL and domain
    // Encode only the URL, not the JSON structure
    const encodedUrl = encodeURIComponent(targetUrl);
    const infoData = `{"url":"${encodedUrl}","domain":"${domain}"}`;
    const formBody = `info=${infoData}`;

    console.log('Form Data:', formBody);

    // Make POST request
    const response = await fetch('https://srv.badasserver1.com/get-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
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

    // Log response details
    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    // Get response data
    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log('Response Data:', responseData);

    // Transform response data to add download URLs
    if (responseData && typeof responseData === 'object' && responseData.sources?.mp4) {
      const downloadBaseUrl = 'https://srv.badasserver1.com/download?data=';
      
      for (const quality in responseData.sources.mp4) {
        if (responseData.sources.mp4[quality]?.src) {
          responseData.sources.mp4[quality].src = downloadBaseUrl + responseData.sources.mp4[quality].src;
        }
      }
    }

    // Return the response
    return NextResponse.json({
      success: true,
      targetUrl,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
