// Scrape net52.cc home page via our working API to find Prime section IDs
(async () => {
  // Use the working cookies from the API
  const r = await fetch('http://localhost:9090/api/netmirror?action=home');
  const d = await r.json();
  console.log('Home items:', d.data?.items?.length, '| Success:', d.success);
  
  // Also try raw home page via proxy
  const r2 = await fetch('http://localhost:9090/api/netmirror?action=proxy&url=https://net52.cc/home', {
    headers: { 'Accept': 'text/html,*/*' }
  });
  const html = await r2.text();
  console.log('\nProxy home length:', html.length);
  console.log('Has data-post:', html.includes('data-post'));
  
  // Check sections
  if (html.includes('data-post')) {
    const rows = html.split('lolomoRow');
    console.log('Rows:', rows.length - 1);
    rows.slice(1, 5).forEach((row, i) => {
      const title = (row.match(/row-header-title[^>]*>([^<]+)/) || [])[1] || 'Unknown';
      const ids = row.match(/data-post="\d+"/g) || [];
      console.log(`  Row ${i+1}: "${title}" - ${ids.length} items`);
    });
  }
})().catch(console.error);
