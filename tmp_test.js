const https = require('https');

async function testFetch() {
  const body = JSON.stringify({
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        clientScreen: "WATCH",
        hl: "en",
        gl: "US",
      },
      thirdParty: {
        embedUrl: "https://www.youtube.com"
      }
    },
    videoId: "erLk59H86ww", // sample video
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: 19800
      }
    }
  });

  const options = {
    hostname: 'www.youtube.com',
    path: '/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  };

  const req = https.request(options, (res) => {
    let raw = '';
    res.on('data', (d) => { raw += d; });
    res.on('end', () => {
      const data = JSON.parse(raw);
      if (data.streamingData) {
        console.log("SUCCESS! Formats found:", data.streamingData.formats?.length || 0, data.streamingData.adaptiveFormats?.length || 0);
        // console.log(data.streamingData.adaptiveFormats[0]);
      } else {
        console.log("FAILED to get streaming data:", data.playabilityStatus || data);
      }
    });
  });
  req.write(body);
  req.end();
}

testFetch();
