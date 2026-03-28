const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false, // watch visually
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--autoplay-policy=no-user-gesture-required',
            '--disable-web-security' // allow sw to fetch anything
        ],
        defaultViewport: null
    });

    try {
        const page = await browser.newPage();
        
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        
        client.on('Network.requestWillBeSent', p => {
            const u = p.request.url;
            // Ignore some noise
            if(!u.includes('tailwindcss') && !u.includes('fontawesome') && !u.includes('doubleclick') && !u.includes('google-analytics')) {
                console.log(`[REQ] ${p.type}: ${u.substring(0, 150)}...`);
            }
        });

        // Let player initialize and play!
        await page.goto('https://abysscdn.com/?v=K8R6OOjS7', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log('Page loaded. Waiting for playback to start automatically or clicking...');
        await page.waitForTimeout(5000);
        await page.mouse.click(500, 300);
        await page.waitForTimeout(10000);
        
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
