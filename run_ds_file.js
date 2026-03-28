const cheerio = require('cheerio');
async function run() {
  const url = 'https://driveseed.org/file/7NIHSo8taecKtlp7qdbg';
  console.log('Fetching:', url);
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const $ = cheerio.load(html);
  
  const instantLink = $('a:contains("INSTANT DOWNLOAD"), a[href*="video-seed"]').first().attr('href') ||
                      $('.btn.btn-danger').first().attr('href');
  console.log('Instant Download Href:', instantLink);
  // Also dump a sample
  const m = html.match(/[\"']https?:\/\/[^\s\"']+video-seed[^\s\"']+[\"']/gi);
  console.log('Script matches:', m);
}
run();
