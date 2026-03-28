const cheerio = require('cheerio');
async function test() {
  const url = 'https://episodes.animeflix.dad/archives/10393';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const $ = cheerio.load(html);

  const episodes = [];
  $('.entry-content a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      if (href && (href.includes('1drv') || href.includes('hub') || href.includes('drive'))) {
          episodes.push({ text: text.trim(), href: href });
      }
  });
  console.log(episodes.slice(0, 5));
}
test();
