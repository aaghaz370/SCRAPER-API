const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function extractAbyss(slug) {
    const url = `https://abysscdn.com/?v=${slug}`;
    console.log(`[*] Extracting Abyss: ${url}`);
    
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'
        ]
    });

    try {
        const page = await browser.newPage();
        
        let extractedSources = null;

        // Collect logs that have [ABYSS_SOURCES]
        page.on('console', msg => {
            const text = msg.text();
            if (text.startsWith('[ABYSS_SOURCES]')) {
                try {
                    extractedSources = JSON.parse(text.replace('[ABYSS_SOURCES]', ''));
                } catch(e) {}
            }
        });

        // Hook jwplayer.setup to grab the configuration containing the 'file' links
        await page.evaluateOnNewDocument(() => {
            window.jwplayer = function() {
                return {
                    setup: function(opts) {
                        try {
                            if (opts && opts.sources) {
                                console.log('[ABYSS_SOURCES]' + JSON.stringify(opts.sources));
                                window.ABYSS_EXTRACTED = true;
                            }
                        } catch(e) {}
                    },
                    on: () => {}, load: () => {}, remove: () => {}, play: () => {}, pause: () => {}, seek: () => {},
                    getQualityLevels: () => [{label: 'Auto'}], getCurrentQuality: () => 0, setCurrentQuality: () => {}
                };
            };
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForFunction('window.ABYSS_EXTRACTED === true', { timeout: 10000 }).catch(() => {});
        
        return extractedSources;

    } catch (e) {
        console.error('[!] Error:', e);
        return null;
    } finally {
        await browser.close();
    }
}

// Ensure script is callable via CLI
if (require.main === module) {
    const slug = process.argv[2] || 'K8R6OOjS7';
    extractAbyss(slug).then(sources => {
        if(sources) {
            console.log('\n─── SUCCESS: ABYSS MP4 LINKS ───');
            console.log(JSON.stringify(sources, null, 2));
        } else {
            console.log('\n[-] Failed to grab Abyss Links');
        }
    });
}

module.exports = extractAbyss;
