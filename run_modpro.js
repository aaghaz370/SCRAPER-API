const cheerio = require('cheerio');

async function test() {
  const url = 'https://links.modpro.blog/archives/151415';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const $ = cheerio.load(html);
  
  const links = [];
  $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const host = new URL(url).hostname;
      if (href.startsWith('http') && !href.includes(host) && !href.includes('templatelens') && !href.includes('wordpress') && !href.includes('t.me') && !href.includes('telegram')) {
          links.push(href);
      }
  });
  console.log(links);
}
test();
