const { Innertube, UniversalCache } = require('youtubei.js');

async function checkKids() {
    const yt = await Innertube.create({ generate_session_locally: true, cache: new UniversalCache(false) });
    try {
        const info = await yt.kids.getInfo("erLk59H86ww");
        console.log("KIDS STATUS:", info.playability_status?.status, "FORMATS:", info.streaming_data?.formats?.length || 0);
    } catch(e) {
        console.log("KIDS ERROR", e.message);
    }
}
checkKids();
