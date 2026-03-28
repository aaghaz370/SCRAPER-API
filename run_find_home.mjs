import { load } from 'cheerio';

(async () => {
    try {
        const { cookies } = await (await fetch('https://anshu78780.github.io/json/cookies.json')).json();
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Cookie": cookies,
            "Referer": "https://net22.cc/",
            "Accept": "text/html,application/xhtml+xml"
        };
        const res = await fetch(`https://net22.cc/`, { headers });
        const html = await res.text();
        const $ = load(html);
        let found = [];
        
        $('.lolomoRow').each((_, rowElement) => {
            const categoryTitle = $(rowElement).find('.row-header-title').text().trim();
            $(rowElement).find('.slider-item').each((_, itemElement) => {
                const title = $(itemElement).find('a.slider-refocus').attr('aria-label') || '';
                const dataPost = $(itemElement).attr('data-post');
                if (title.toLowerCase().includes('jailer') || title.toLowerCase().includes('squid')) {
                    found.push({ title, dataPost, category: categoryTitle });
                }
            });
        });
        
        console.log("Found on homepage:", found);
    } catch(err) {
        console.error("Error:", err);
    }
})();
