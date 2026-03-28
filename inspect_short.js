const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Log all requests
    page.on('request', request => {
        const url = request.url();
        if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('storage.googleapis')) {
            console.log('>>> MEDIA OR API REQUEST:', url);
            console.log('    Headers:', request.headers());
        }
    });

    try {
        console.log('Visiting short.icu/onCI1KEcH...');
        await page.goto('https://short.icu/onCI1KEcH', { waitUntil: 'networkidle2' });
        
        let html = await page.content();
        fs.writeFileSync('short.html', html);
        
        // Let's check if there is an iframe inside it
        const frames = page.frames();
        console.log(`Found ${frames.length} frames.`);
        for (const frame of frames) {
            console.log('Frame URL:', frame.url());
            if (frame.url().includes('abysscdn.com')) {
                const frameHtml = await frame.content();
                fs.writeFileSync('abyss_frame.html', frameHtml);
            }
        }
        
    } catch (e) {
        console.error('Error:', e);
    }
    
    await browser.close();
})();
