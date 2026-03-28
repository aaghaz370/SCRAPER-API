const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('series_page.html', 'utf8');
const $ = cheerio.load(html);

const d = [];
let currentGroup = 'Download Links';
$('h2, h3, h4, p, a').each((_, el) => {
   const tag = $(el).prop('tagName').toLowerCase();
   
   if (['h2', 'h3', 'h4'].includes(tag)) {
        const text = $(el).text().trim();
        if (text && text.length < 100 && (text.includes('480p') || text.includes('720p') || text.includes('1080p') || text.toLowerCase().includes('download'))) {
            currentGroup = text.replace(/^Download\s+/i, '').replace(/\[[^\]]+\]/g, '').trim();
        }
   }
   
   if (tag === 'p') {
       // if group is inside a p tag before buttons e.g Download Sankalp 480p
       const text = $(el).text().trim();
       if (text.toLowerCase().includes('download') && text.length < 150) {
           currentGroup = text.replace(/^Download\s+/i, '').replace(/\[[^\]]+\]/g, '').trim();
       }
   }
   
   if (tag === 'a') {
       let hr = $(el).attr('href');
       let cls = $(el).attr('class') || '';
       let txt = $(el).text().trim();
       if (hr && hr.startsWith('http') && (cls.includes('btn') || cls.includes('button') || cls.includes('maxbutton') || hr.includes('leechpro') || hr.includes('modpro') || hr.includes('archives'))) {
           if (!txt.toLowerCase().includes('telegram') && !txt.toLowerCase().includes('whatsapp')) {
                d.push({server: txt || 'Download', url: hr, group: currentGroup});
           }
       }
   }
});

console.log(JSON.stringify(d, null, 2));
