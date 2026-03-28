const https = require('https');

https.get("https://pipedapi.kavin.rocks/streams/erLk59H86ww", (res) => {
  let raw = '';
  res.on('data', d => raw += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(raw);
      console.log("Audio formats:", data.audioStreams?.length);
      console.log("Video formats:", data.videoStreams?.length);
      console.log("Audio Stream 1 sample:", data.audioStreams?.[0]?.url.substring(0, 100));
    } catch(e) {
      console.log("fail");
    }
  });
});
