const cheerio = require('cheerio');
const fs = require('fs');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    // Step 1: Get the leechpro page
    const leechUrl = 'https://leechpro.blog/archives/34565';
    console.log('\n=== STEP 1: Fetching leechpro page:', leechUrl);
    const r1 = await fetch(leechUrl, { headers: HEADERS });
    const html1 = await r1.text();
    
    const $ = cheerio.load(html1);
    const links = [];
    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (href.startsWith('http') && !href.includes('leechpro.blog')) {
            links.push({ href, text });
        }
    });
    console.log('External links found:', links);
    
    if (links.length === 0) {
        console.log('\nHTML sample:', html1.substring(0, 500));
        return;
    }
    
    // Step 2: Take the first unblockedgames link
    const unblocked = links.find(l => l.href.includes('unblockedgames') || l.href.includes('tech2down') || l.href.includes('techy'));
    if (!unblocked) {
        console.log('No unblockedgames link found. All links:', links);
        return;
    }
    
    const unblockedUrl = unblocked.href;
    console.log('\n=== STEP 2: WP SafeLink page:', unblockedUrl);
    
    let cookieJar = '';
    const r2 = await fetch(unblockedUrl, { headers: HEADERS });
    const sc2 = r2.headers.get('set-cookie'); if (sc2) cookieJar = sc2;
    const html2 = await r2.text();
    const $2 = cheerio.load(html2);
    
    let fd1 = {};
    $2('form input').each((_, el) => { const n = $2(el).attr('name'), v = $2(el).attr('value'); if (n) fd1[n] = v || ''; });
    const fa1 = $2('form').attr('action') || unblockedUrl;
    console.log('Form 1 action:', fa1);
    console.log('Form 1 fields:', fd1);
    
    if (Object.keys(fd1).length === 0) {
        console.log('\nNo form found! HTML sample:');
        console.log(html2.substring(0, 800));
        fs.writeFileSync('debug_unblocked.html', html2);
        console.log('Full HTML saved to debug_unblocked.html');
        return;
    }
    
    console.log('\nWaiting 3.5s...');
    await delay(3500);
    
    // Step 3: POST form 1
    console.log('\n=== STEP 3: POST form 1 to:', fa1);
    const r3 = await fetch(fa1, {
        method: 'POST', body: new URLSearchParams(fd1),
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': unblockedUrl, 'Cookie': cookieJar }
    });
    const sc3 = r3.headers.get('set-cookie'); if (sc3) cookieJar += '; ' + sc3;
    const html3 = await r3.text();
    const $3 = cheerio.load(html3);
    
    let fd2 = {};
    $3('form input').each((_, el) => { const n = $3(el).attr('name'), v = $3(el).attr('value'); if (n) fd2[n] = v || ''; });
    const fa2 = $3('form').attr('action') || fa1;
    console.log('Form 2 action:', fa2);
    console.log('Form 2 fields:', fd2);
    
    if (Object.keys(fd2).length === 0) {
        console.log('No form 2. HTML sample:');
        console.log(html3.substring(0, 800));
        return;
    }
    
    await delay(1000);
    
    // Step 4: POST form 2
    console.log('\n=== STEP 4: POST form 2 to:', fa2);
    const r4 = await fetch(fa2, {
        method: 'POST', body: new URLSearchParams(fd2),
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': fa1, 'Cookie': cookieJar }
    });
    const sc4 = r4.headers.get('set-cookie'); if (sc4) cookieJar += '; ' + sc4;
    const html4 = await r4.text();
    
    fs.writeFileSync('debug_step4.html', html4);
    console.log('Step 4 HTML saved to debug_step4.html');
    
    // Check for s_343 and go URL
    const s343 = html4.match(/s_343\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
    const goHref = html4.match(/c\.setAttribute\(["']href["']\s*,\s*["']([^"']+)["']\)/);
    
    console.log('s_343 match:', s343 ? s343[1] + ' : ' + s343[2].substring(0,20) + '...' : 'NOT FOUND');
    console.log('go_href match:', goHref ? goHref[1] : 'NOT FOUND');
    
    if (s343 && goHref) {
        const cookieKey = s343[1];
        const cookieVal = s343[2];
        const goUrl = goHref[1].startsWith('http') ? goHref[1] : new URL(goHref[1], unblockedUrl).href;
        cookieJar += `; ${cookieKey}=${encodeURIComponent(cookieVal)}`;
        
        console.log('\n=== STEP 5: GET ?go= URL:', goUrl);
        await delay(1500);
        const r5 = await fetch(goUrl, { headers: { ...HEADERS, 'Referer': fa2, 'Cookie': cookieJar }, redirect: 'manual' });
        console.log('Status:', r5.status);
        console.log('Location:', r5.headers.get('location'));
        const html5 = await r5.text();
        console.log('HTML5 sample:', html5.substring(0, 300));
    }
}
run();
