const https = require('https');

const videoId = "erLk59H86ww";
const options = {
  hostname: 'www.youtube.com',
  path: `/watch?v=${videoId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': 'CONSENT=YES+1; SOCS=CAESEwgDEgk0OTcxMzI3NTIaAmVuIAEaBgiAlLKxBg=='
  }
};

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (d) => { raw += d; });
  res.on('end', () => {
    // regex math ytInitialPlayerResponse
    const match = raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});var/s) || raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/s);
    if(match) {
      const data = JSON.parse(match[1]);
      if(data.streamingData) {
        console.log("SUCCESS! Got streaming data via HTML Googlebot Hack! Formats:", data.streamingData.formats?.length || 0, "Adaptive:", data.streamingData.adaptiveFormats?.length || 0);
        console.dir(data.streamingData.adaptiveFormats[0], {depth:0});
      } else {
        console.log("Found ytInitialPlayerResponse but no streaming data. status:", data.playabilityStatus?.status);
      }
    } else {
      console.log("Failed to find ytInitialPlayerResponse");
    }
  });
});
req.end();
