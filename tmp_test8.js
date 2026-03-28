const https = require('https');

https.get("https://yewtu.be/api/v1/videos/erLk59H86ww", (res) => {
  let raw = '';
  res.on('data', d => raw += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(raw);
      console.log("SUCCESS. Formatstreams:", data.formatStreams?.length, "Adaptive:", data.adaptiveFormats?.length);
    } catch(e) {
      console.log("fail");
    }
  });
});
