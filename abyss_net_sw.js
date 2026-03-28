const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    try {
        const page = await browser.newPage();
        
        // Target all to see service worker
        page.on('workercreated', async worker => {
            console.log('Worker created:', worker.url());
            try {
                const client = await worker.client();
                await client.send('Network.enable');
                client.on('Network.requestWillBeSent', p => {
                    const u = p.request.url;
                    if(u.includes('storage') || u.includes('.mp4') || u.includes('.m3u8')) {
                        console.log('[SW REQ]', u.substring(0, 200));
                        console.log('[SW HEADERS]', p.request.headers);
                    }
                });
            } catch(e) {}
        });

        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        client.on('Network.requestWillBeSent', p => {
            const u = p.request.url;
            if(u.includes('storage') || u.includes('.mp4') || u.includes('.m3u8')) {
                console.log('[PAGE REQ]', u.substring(0, 200));
            }
        });

        await page.goto('https://abysscdn.com/?v=K8R6OOjS7', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('Waiting for play...');
        await page.mouse.click(600, 400); // click center to play
        await new Promise(r => setTimeout(r, 8000));
        
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
