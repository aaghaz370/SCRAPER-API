const h = require('fs').readFileSync('abyss_page.html', 'utf8');

// Get ALL iframes with full src
const iframes = [...h.matchAll(/<iframe([^>]*)>/gi)];
console.log('IFRAMES:');
iframes.forEach(m => {
  const attrs = m[1];
  const srcMatch = attrs.match(/src="([^"]+)"/i);
  console.log('Full attrs:', attrs.replace(/\s+/g,' ').slice(0, 500));
  if (srcMatch) console.log('SRC:', srcMatch[1]);
});

// Find the v= param
const vParams = [...h.matchAll(/\?v=([a-zA-Z0-9_\-]+)/g)].map(m => m[1]);
console.log('\nAll ?v= params:', [...new Set(vParams)]);

// Find any abysscdn URLs
const abyss = [...h.matchAll(/(abysscdn[^\s"'<>]{0,100})/gi)].map(m => m[1]);
console.log('\nAbyssCDN URLs:', [...new Set(abyss)]);

// Show the actual src of the iframe (might be dynamically set)
const iframeSrc = [...h.matchAll(/iframe[^>]*src="([^"]+)"/gi)].map(m => m[1]);
console.log('\nIframe srcs:', iframeSrc);

// Show 500 chars around the iframe
const iIdx = h.indexOf('<iframe');
if (iIdx > 0) console.log('\nIframe context:\n', h.slice(iIdx, iIdx+600));
