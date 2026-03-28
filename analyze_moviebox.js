const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function findRealApiCalls() {
  // MovieBox uses fetch() calls internally - try finding from the JS bundle
  const r = await fetch('https://h5-static.aoneroom.com/ssrStatic/movieboxId/public/_nuxt/D64hHsQ0.js', { headers: { 'User-Agent': UA } });
  const js = await r.text();
  
  // Find the specific search function/endpoint
  // Look for patterns like: fetch('/api/xxx') or axios.get('/v1/xxx')
  const searchContexts = [];
  let idx = 0;
  while ((idx = js.indexOf('search', idx)) !== -1) {
    const ctx = js.substring(idx - 50, idx + 100);
    if (ctx.includes('http') || ctx.includes('url') || ctx.includes('fetch') || ctx.includes('request')) {
      searchContexts.push(ctx.replace(/\n/g, ' ').trim());
    }
    idx++;
    if (searchContexts.length >= 10) break;
  }
  
  console.log('SEARCH contexts:');
  searchContexts.forEach((c, i) => console.log(`${i}: ${c}`));
  
  // Also look for the API configuration  
  const cfgContexts = [];
  const cfgPatterns = ['baseURL', 'apiBase', 'API_URL', 'apiUrl', 'BASE_URL'];
  for (const pat of cfgPatterns) {
    let i = 0;
    while ((i = js.indexOf(pat, i)) !== -1) {
      cfgContexts.push(`${pat}: ${js.substring(i, i + 100).replace(/\n/, ' ')}`);
      i++;
      if (cfgContexts.length >= 5) break;
    }
  }
  console.log('\nConfig contexts:', cfgContexts.slice(0, 5));
}
findRealApiCalls();
