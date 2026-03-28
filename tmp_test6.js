const https = require('https');

const videoId = "erLk59H86ww";
const options = {
  hostname: 'www.youtube.com',
  path: `/embed/${videoId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.youtube.com/'
  }
};

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (d) => { raw += d; });
  res.on('end', () => {
    // console.log(raw.substring(0, 5000));
    const match = raw.match(/ytInitialPlayerResponse\s*=\s*({.+?});var/s) || raw.match(/ytcfg\.set\({['"]PLAYER_VARS['"]:({.+?})}\);/s);
    if(match) {
        console.log("MATCH FOUND!");
        try {
            const parsed = JSON.parse(match[1]);
            if (parsed.embedded_player_response) {
                const inner = JSON.parse(parsed.embedded_player_response);
                console.log("embedded_player_response formats:", inner.streamingData?.formats?.length || 0);
            }
        } catch(e) {
            console.log("parse error");
        }
    } else {
      console.log("NOT FOUND");
    }
  });
});
req.end();
