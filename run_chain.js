const cheerio = require('cheerio');

async function testChain() {
  const url = 'https://episodes.modpro.blog/archives/126247';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const t = await r.text();
  const $ = cheerio.load(t);
  
  let link = '';
  $('a').each((i, el) => {
    if($(el).attr('href') && $(el).attr('href').includes('?id=')) {
       link = $(el).attr('href');
    }
  });

  if(link.startsWith('/')) link = 'https://episodes.modpro.blog' + link;
  
  console.log('Fetching', link);
  const r2 = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' });
  console.log('Status:', r2.status);
  console.log('Location:', r2.headers.get('location'));
  const t2 = await r2.text();
  console.log('HTML Scripts:', t2.match(/<script.*?>(.*?)<\/script>/gis));
  if(t2.includes('window.location')) console.log('Location match:', t2.match(/window\.location.*/gi));
}
testChain();
