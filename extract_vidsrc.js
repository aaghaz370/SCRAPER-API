const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function extractM3u8(url) {
    console.log("Extracting from: ", url);
    const browser = await puppeteer.launch({
        headless: false, // Turn off headless to avoid immediate bot detection on CF, or at least run new headless
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    let m3u8Urls = [];
    
    page.on('request', request => {
        const reqUrl = request.url();
        if (reqUrl.includes('.m3u8')) {
            console.log("\n[+] FOUND M3U8 STREAM:", reqUrl);
            m3u8Urls.push(reqUrl);
        }
        if (reqUrl.includes('.mp4')) {
            console.log("\n[+] FOUND MP4 STREAM:", reqUrl);
        }
    });

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        console.log("Page loaded. Waiting to see if any iframes appear or if auto-play triggers...");
        
        await new Promise(r => setTimeout(r, 5000));
        
        // Try clicking around center of page to trigger play
        await page.mouse.click(page.viewport().width / 2, page.viewport().height / 2);
        await new Promise(r => setTimeout(r, 5000));
        
        const iframes = await page.$$('iframe');
        console.log(`Found ${iframes.length} iframes`);
        
        for (let iframe of iframes) {
             const src = await iframe.evaluate(el => el.src);
             console.log("Iframe src:", src);
        }
        
        // Click play buttons inside iframes if possible
        for (const frame of page.frames()) {
            try {
                const playBtn = await frame.$('#play-now, .play-btn, .plyr__control--overlaid, .jw-display-icon-display, .play-button');
                if (playBtn) {
                    console.log("Clicking play button in frame:", frame.url());
                    await playBtn.click();
                    await new Promise(r => setTimeout(r, 5000));
                }
            } catch(e) {}
        }
        
    } catch (e) {
        console.error("Error navigating: ", e.message);
    }
    
    await browser.close();
    return m3u8Urls;
}

(async () => {
    // TMDB ID 385687 is Fast X
    console.log(">> Vidsrc.me extraction...");
    // Let's test standard endpoints.
    await extractM3u8("https://vidsrc.me/embed/movie?tmdb=385687");
    
    console.log("\n>> Rivestream extraction...");
    await extractM3u8("https://rivestream.org/embed/movie?tmdb=385687");
})();
