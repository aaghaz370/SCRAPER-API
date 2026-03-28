const cheerio = require('cheerio');
async function test() {
  const url = 'https://episodes.animeflix.dad/archives/10393';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const c = cheerio.load(html);
  
  const hrefs = [];
  c('.entry-content a').each((i, el) => {
      const href = c(el).attr('href');
      if (href && href.includes('getlink')) hrefs.push(href);
  });
  console.log('Live links:', hrefs.slice(0, 2));

  if (hrefs.length > 0) {
      const liveLink = hrefs[0];
      console.log('Fetching live link:', liveLink);
      const r2 = await fetch(liveLink, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url }});
      const html2 = await r2.text();
      const c2 = cheerio.load(html2);
      
      const s343 = html2.match(/s_343\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
      console.log('s_343 found?', !!s343);
      if (s343) console.log('key:', s343[1], 'val:', s343[2]);
      
      let fd = html2.match(/<input.*?name=["']([^"']+)["'].*?value=["']([^"']*)["']/gi);
      console.log('Inputs found?', fd ? fd.length : 0);
  }
}
test();
