const cheerio = require('cheerio');
async function run() {
  const url = 'https://episodes.modpro.blog/archives/126247';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
  const text = await r.text();
  const $ = cheerio.load(text);
  
  const links = [];
  $('a').each((i, el) => {
     const href = $(el).attr('href');
     let linkText = $(el).text().trim();
     if (!linkText) {
        // try to find text inside children
        linkText = $(el).find('h3, span, div, p').text().trim() || 'No Text';
     }
     if(href && href.includes('?id=')) {
         links.push({ text: linkText, href: href.startsWith('/') ? 'https://episodes.modpro.blog' + href : href });
     }
  });
  console.log(JSON.stringify(links, null, 2));
}
run();
