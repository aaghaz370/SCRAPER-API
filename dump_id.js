const fs = require('fs');

const html = fs.readFileSync('net22.html', 'utf8');
const idStr = '81902148';
const idx = html.indexOf(idStr);

if (idx !== -1) {
    console.log(html.substring(idx - 200, idx + 800));
} else {
    console.log('Not found');
}
