const cheerio = require('cheerio');
async function test() {
  const url = 'https://episodes.animeflix.dad/getlink/cB88wFkKDdJ9LIKPqrSdjPXQYsYgMbOdJQbAQv8g==';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const c = cheerio.load(html);
  
  const hrefs = [];
  c('a').each((i, el) => {
      hrefs.push(c(el).attr('href'));
  });
  console.log(hrefs);
}
test();
