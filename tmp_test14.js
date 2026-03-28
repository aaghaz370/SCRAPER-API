const https = require('https');

const options = {
  hostname: 'm.youtube.com',
  path: `/watch?v=erLk59H86ww`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://m.youtube.com/'
  }
};

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (d) => { raw += d; });
  res.on('end', () => {
    const match = raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});var/s) 
               || raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/s);
    if(match) {
        try {
            const parsed = JSON.parse(match[1]);
            const formats = parsed.streamingData?.adaptiveFormats || [];
            console.log("CIPHERED?", !!formats[0]?.signatureCipher);
            console.log("URL?", !!formats[0]?.url);
            console.log("URL SAMPLE:", formats[0]?.url?.substring(0, 50));
        } catch(e) {
            console.log("PARSE ERROR");
        }
    } else {
      console.log("NOT FOUND");
    }
  });
});
req.end();
