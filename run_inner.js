const cheerio = require('cheerio');
async function run() {
  const url = 'https://episodes.modpro.blog/cdn-cgi/content?id=e_Lh6PSRWGcU_44qFudtPv5ftPiakmipnVw04VzpwWs-1773744751.6723213-1.0.1.1-pnMJ.DgNQMIWL9vgBRNXEO12S.HB0MZlO5Nm89HcbXE';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
  const text = await r.text();
  const $ = cheerio.load(text);
  
  console.log('Links:');
  $('a').each((i, el) => console.log($(el).text().trim(), '->', $(el).attr('href')));
  
  console.log('Scripts:');
  $('script').each((i, el) => console.log($(el).html()));
  
  console.log('Iframes:');
  $('iframe').each((i, el) => console.log($(el).attr('src')));

  const m = text.match(/window\.location(?:\.replace|\.href|\.assign)?\s*[=(]\s*["']([^"']+)["']/i);
  if(m) console.log('Redirect:', m[1]);
}
run();
