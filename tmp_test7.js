const https = require('https');

async function checkXbox() {
    const videoId = "erLk59H86ww";
    const body = JSON.stringify({
        context: {
            client: {
                clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
                clientVersion: "2.0",
                hl: "en",
                gl: "US",
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edge/44.18363.8131",
            }
        },
        videoId: videoId
    });

    const options = {
        hostname: 'www.youtube.com',
        path: '/youtubei/v1/player',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edge/44.18363.8131"
        }
    };

    const req = https.request(options, res => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            const data = JSON.parse(raw);
            console.log(data.playabilityStatus?.status, data.streamingData?.formats?.length || 0);
        });
    });
    req.write(body);
    req.end();
}
checkXbox();
