const cheerio = require('cheerio');
async function run() {
  const r = await fetch('https://moviesmod.pink/download-that-night-season-1-hindi-480p-720p-1080p/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const t = await r.text();
  const $ = cheerio.load(t);
  
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('episodes.modpro.blog') || href.includes('leechpro.blog')) {
      const text = $(el).text().trim();
      let context = '';
      
      // Look for the closest preceding heading
      context = $(el).closest('p').prevAll('h3, h2, h4, h5').first().text().trim();
      if(!context) {
          context = $(el).parent().prevAll('h3, h2, h4, h5, p').first().text().trim();
      }
      
      console.log('Button:', text, '| Context:', context, '| Href:', href);
    }
  });
}
run();
