const cheerio = require('cheerio');
const fs = require('fs');
async function run() {
  const url = 'https://driveseed.org/file/7NIHSo8taecKtlp7qdbg';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  fs.writeFileSync('ds_file.html', html);
  console.log('Saved to ds_file.html');
}
run();
