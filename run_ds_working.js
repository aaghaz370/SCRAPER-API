const cheerio = require('cheerio');
const fs = require('fs');
async function run() {
  const url = 'https://driveseed.org/file/7013ePV1Bj';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  fs.writeFileSync('ds_working.html', html);
  console.log('Saved to ds_working.html. Length:', html.length);
  
  const $ = cheerio.load(html);
  $('a').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text.toLowerCase().includes('download') || (href && href.includes('seed'))) {
          console.log(`Button: [${text}] -> ${href}`);
      }
  });

  const m = html.match(/[\"']https?:\/\/[^\s\"']+video-seed[^\s\"']+[\"']/gi);
  if (m) console.log('Script matches:', m);
}
run();
