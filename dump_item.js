const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('net22.html', 'utf8');
const $ = cheerio.load(html);

const markup = $('.slider-item[data-post="81902148"]').first().html();
console.log(markup);

// Also let's see how many `aria-label`s exist globally that match Viking Wolf
console.log('Viking Wolf count:', $('a[aria-label="Viking Wolf"]').length);
