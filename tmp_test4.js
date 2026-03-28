const { Innertube, UniversalCache } = require('youtubei.js');

async function testClients() {
  const yt = await Innertube.create({
    generate_session_locally: true,
    cache: new UniversalCache(false)
  });

  const clients = ["TV_EMBEDDED", "IOS", "ANDROID", "WEB_CREATOR", "MWEB", "WEB"];
  for (const c of clients) {
    try {
      const info = await yt.getInfo("erLk59H86ww", { clientType: c });
      const status = info.playability_status?.status;
      console.log(`[${c}] STATUS: ${status}. Streams: ${info.streaming_data?.formats?.length || 0}`);
    } catch (e) {
      console.log(`[${c}] ERROR:`, e.message);
    }
  }
}

testClients();
