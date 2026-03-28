const https = require('https');

const videoId = "erLk59H86ww";
const options = {
  hostname: 'www.youtube.com',
  path: `/watch?v=${videoId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  }
};

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (d) => { raw += d; });
  res.on('end', () => {
    // console.log(raw.substring(0, 1000));
    const match = raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});var/s) || raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/s);
    if(match) {
      try {
        const data = JSON.parse(match[1]);
        if(data.streamingData) {
          console.log("SUCCESS!", data.streamingData.formats?.length || 0);
        } else {
          console.log("NO STREAMING DATA:", data.playabilityStatus);
        }
      } catch(e) {
        console.log("JSON PARSE ERROR");
      }
    } else {
      console.log("ytInitialPlayerResponse NOT FOUND");
    }
  });
});
req.end();
