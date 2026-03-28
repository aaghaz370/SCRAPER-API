const { Innertube, UniversalCache } = require('youtubei.js');

async function checkMusic() {
    const yt = await Innertube.create({ generate_session_locally: true, cache: new UniversalCache(false) });
    try {
        const info = await yt.music.getInfo("erLk59H86ww");
        console.log("MUSIC STATUS:", info.playability_status?.status, "FORMATS:", info.streaming_data?.formats?.length || 0);
    } catch(e) {
        console.log("MUSIC ERROR", e.message);
    }
}
checkMusic();
