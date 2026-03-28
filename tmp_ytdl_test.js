const ytdl = require('@distube/ytdl-core');

async function test() {
  const videoId = 'dQw4w9WgXcQ';
  try {
    const info = await ytdl.getInfo(videoId);
    const formats = info.formats;
    console.log('SUCCESS! Formats count:', formats.length);
    const videoFmt = formats.filter(f => f.hasVideo && f.hasAudio);
    const audioFmt = formats.filter(f => !f.hasVideo && f.hasAudio);
    console.log('Video+Audio:', videoFmt.length, 'AudioOnly:', audioFmt.length);
    console.log('Sample video URL:', videoFmt[0]?.url?.substring(0, 60));
    console.log('Title:', info.videoDetails.title);
  } catch(e) {
    console.error('FAIL:', e.message);
  }
}
test();
