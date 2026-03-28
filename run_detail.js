const cheerio = require('cheerio');

async function testSite() {
  const url = 'https://moviesmod.pink';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const a = $('.post-item, article.item, .page-item, article, div.item').first().find('a').first();
  const link = a.attr('href');
  console.log('Fetching detail page:', link);
  
  const res2 = await fetch(link, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html2 = await res2.text();
  const $2 = cheerio.load(html2);
  
  console.log('Download links found:');
  $2('.langu').each((i, el) => {
    console.log(`\nGroup ${i+1}:`);
    $2(el).find('a').each((j, ael) => {
       console.log(' - ' + $2(ael).text().trim(), $2(ael).attr('href'));
    });
  });

  // some might use generic buttons
  console.log('\nChecking all large buttons:');
  $2('a[class*="btn"], a[class*="button"]').each((i, el) => {
    const t = $2(el).text().trim();
    if(t) console.log(t, '->', $2(el).attr('href'));
  });

  // check exactly what's inside the text for episode links/buttons
  const epLinks = $2('a:contains("Episode Links")');
  console.log('\nEpisode Links exact size:', epLinks.length);
  epLinks.each((i, el) => {
     console.log($2(el).text().trim(), $2(el).attr('href'));
  });

  const btnLinks = $2('a.maxbutton');
  console.log('\nMaxbutton class elements:', btnLinks.length);
  btnLinks.each((i, el) => {
     console.log($2(el).text().trim(), $2(el).attr('href'), $2(el).attr('class'));
  });
  
  // also dump any generic strong or h3 with download links
  $2('h3:contains("Download")').each((i, h3) => {
      console.log('H3 text:', $2(h3).text());
      // the next element might have links
      console.log($2(h3).next('p').html());
  });
}
testSite();
