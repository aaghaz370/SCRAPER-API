const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('net22.html', 'utf8');
const $ = cheerio.load(html);

$('.slider-item').slice(0, 10).each((i, el) => {
  const $el = $(el);
  const postId = $el.attr('data-post');
  const aLabel = $el.find('a').attr('aria-label');
  const imgAlt = $el.find('.boxart-image').attr('alt');
  const fallback = $el.find('.fallback-text').text().trim();
  
  console.log(`ID: ${postId}`);
  console.log(`  aria-label: ${aLabel}`);
  console.log(`  img-alt: ${imgAlt}`);
  console.log(`  fallback: ${fallback}`);
  
  // also check if there's any other text
  const text = $el.text().trim().replace(/\s+/g, ' ').substring(0, 50);
  console.log(`  raw text: ${text}`);
});
