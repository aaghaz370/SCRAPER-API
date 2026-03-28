const cheerio = require('cheerio');
async function run() {
  const url = 'https://driveseed.org/r?key=QnViS2IyL3U5NjJsWk1YMXZwbVNsZXJFN1lLZlZzL2NmSFh3UExzOEt0UzFRT0=&id=TFB1Zzg3YlUvcnl3YnN1QnNBVEVyeHZObkh5UWthZXhQY2FSUFQ1OGQvb1E2cHZnVFBXZFZPWklreWFXb1BCUA==';
  console.log('Fetching:', url);
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  const t = await r.text();
  console.log('Final URL:', r.url);
  
  const m = t.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i);
  if (m) {
      console.log('Found redirect in script:', m[1]);
  } else {
      console.log('HTML Start:', t.substring(0, 300));
  }
}
run();
