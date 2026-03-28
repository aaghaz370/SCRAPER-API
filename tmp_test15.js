const https = require('https');

const data = JSON.stringify({
  url: 'https://youtube.com/watch?v=erLk59H86ww',
});

const options = {
  hostname: 'api.cobalt.tools',
  path: '/',
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let raw = '';
  res.on('data', d => raw += d);
  res.on('end', () => console.log(raw));
});
req.write(data);
req.end();
