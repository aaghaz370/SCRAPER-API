const cheerio = require('cheerio');
async function run() {
  const r = await fetch('https://modlist.in');
  const h = await r.text();
  const $ = cheerio.load(h);
  $('a').each((i, e) => console.log($(e).text().trim(), '->', $(e).attr('href')));
}
run();
