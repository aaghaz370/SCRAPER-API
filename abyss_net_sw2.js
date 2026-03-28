const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Listen to all Network responses, including those from SW via CDP
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');

        client.on('Network.responseReceived', (p) => {
            const u = p.response.url;
            if (p.response.mimeType.includes('video') || p.response.mimeType.includes('audio') || u.includes('.mp4')) {
                console.log('[MEDIA 200]', Math.round(p.response.length/1024), 'KB', u.substring(0, 150));
            } else if (u.includes('storage') || u.includes('googleapis') || u.includes('gcs')) {
                console.log(`[STORAGE ${p.response.status}]`, u.substring(0, 150));
            }
        });

        await page.goto('https://abysscdn.com/?v=K8R6OOjS7', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log('Page loaded. Waiting 10s...');
        await new Promise(r => setTimeout(r, 10000));
        
        await page.mouse.click(640, 360);
        console.log('Clicked play. Waiting 10s...');
        await new Promise(r => setTimeout(r, 10000));
        
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
