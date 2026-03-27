import * as cheerio from 'cheerio';

export const DOMAIN_KEYS = {
    moviesmod: 'hollywood',
    moviesleech: 'bollywood',
    animeflix: 'animeflix',
    uhdmovies: 'uhdmovies'
};

const cachedDomains: Record<string, string> = {
    moviesmod: 'https://moviesmod.pink',
    moviesleech: 'https://moviesleech.link',
    animeflix: 'https://animeflix.dad',
    uhdmovies: 'https://uhdmovies.ink'
};

let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function getLiveDomain(siteKey: 'moviesmod' | 'moviesleech' | 'animeflix' | 'uhdmovies'): Promise<string> {
    const now = Date.now();
    
    // Check if cache expired to fetch new modlist.in links
    if (now - lastFetchTime > CACHE_DURATION) {
        try {
            const res = await fetch('https://modlist.in/', {
               headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
               next: { revalidate: 3600 }
            });
            const html = await res.text();
            const $ = cheerio.load(html);
            
            $('a').each((_, el) => {
                const text = $(el).text().toLowerCase().trim();
                const href = $(el).attr('href');
                if (href && href.startsWith('http')) {
                    if (text.includes('bollywood')) cachedDomains['moviesleech'] = href;
                    else if (text.includes('hollywood')) cachedDomains['moviesmod'] = href;
                    else if (text.includes('anime')) cachedDomains['animeflix'] = href;
                    else if (text.includes('4k')) cachedDomains['uhdmovies'] = href;
                }
            });
            lastFetchTime = now;
        } catch(e) {
            console.error('Failed to update domains from modlist.in', e);
        }
    }
    
    let domainUrl = cachedDomains[siteKey];
    
    // If the URL is still pointing to modlist.in redirector, fetch it to get the actual domain
    if (domainUrl.includes('modlist.in')) {
         try {
             const res = await fetch(domainUrl, { 
                 headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                 redirect: 'follow',
                 next: { revalidate: 3600 }
             });
             
             // First check where the request ended up
             if (res.url && !res.url.includes('modlist.in')) {
                 cachedDomains[siteKey] = res.url.replace(/\/$/, '');
                 return cachedDomains[siteKey];
             }
             
             // If not redirected by HTTP, maybe by HTML meta refresh
             const html = await res.text();
             const m = html.match(/content=["']\d+;\s*url=([^"']+)["']/i);
             if (m && m[1]) {
                 cachedDomains[siteKey] = m[1].replace(/\/$/, '');
             }
         } catch(e) {
             console.error('Failed to resolve redirect for', domainUrl, e);
         }
    }
    
    return cachedDomains[siteKey];
}
