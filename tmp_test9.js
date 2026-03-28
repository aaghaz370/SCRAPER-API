const https = require('https');

const data = JSON.stringify({
  url: 'https://www.youtube.com/watch?v=erLk59H86ww',
  videoQuality: '1080',
  isAudioOnly: false
});

const options = {
  hostname: 'api.cobalt.tools',
  path: '/api/json',
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (d) => { raw += d; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${raw}`);
  });
});
req.write(data);
req.end();
