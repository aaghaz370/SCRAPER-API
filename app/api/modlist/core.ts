import * as cheerio from 'cheerio';
import { getLiveDomain, DOMAIN_KEYS } from './config';

export async function fetchMoviesPage(siteKey: keyof typeof DOMAIN_KEYS, page: number = 1, query: string = '') {
    const domain = await getLiveDomain(siteKey);
    let url = domain;
    
    if (query) {
        url = `${domain}/page/${page}/?s=${encodeURIComponent(query)}`;
    } else if (page > 1) {
        url = `${domain}/page/${page}/`;
    }
    
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const movies: any[] = [];
        $('article').each((_, el) => {
             const a = $(el).find('a').first();
             const link = a.attr('href') || '';
             let title = $(el).find('.title, h2, h3').text().trim() || a.attr('title') || a.text().trim();

             // Prefer the anchor title attribute if it has quality info
             const aTitle = a.attr('title') || '';
             if (aTitle.length > title.length) title = aTitle;
             
             let img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
             
             if(title && link) {
                 const qualityMatch = title.match(/2160p|4K|1080p|720p|480p/i);
                 const quality = qualityMatch ? qualityMatch[0].toUpperCase() : 'HD';
                 
                 const yearMatch = title.match(/(19|20)\d{2}/);
                 const year = yearMatch ? yearMatch[0] : '';
                 
                 let cleanTitle = title
                     .replace(/^Download\s+/i, '')
                     .replace(/\s*\[.*?\]/g, '') // remove [100MB] etc.
                     .trim();
                 
                 movies.push({ title: cleanTitle, url: link, imageUrl: img, quality, year });
             }
        });
        
        return { success: true, baseDomain: domain, page, query, movies: movies.filter((v,i,a) => a.findIndex(t => t.url === v.url) === i) };
    } catch(err: any) {
        return { success: false, error: err.message };
    }
}

export async function fetchMovieDetails(url: string) {
    try {
        const res = await fetch(url, {
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const title = $('h1, h2.title, .entry-title').first().text().replace(/^Download\s+/i, '').trim();
        const img = $('.entry-content img').first().attr('src') || $('article img').first().attr('src') || $('img').first().attr('src');
        const description = $('.setup-info, .entry-content > p').first().text().replace(/Download.+/gi, '').trim();
        
        // ── Parse download links by grouping them by their preceding heading ──
        const downloadGroups: any[] = [];
        const groupMap = new Map<string, {server: string, url: string}[]>();
        
        // Walk through each heading + its following buttons
        let currentGroup = 'Download Links';
        
        $('h2, h3, h4, p, a').each((_, el) => {
            const tag = $(el).prop('tagName')?.toLowerCase() || '';
            
            // If it's a heading, set as current group title
            if (['h2', 'h3', 'h4'].includes(tag)) {
                const headingText = $(el).text().trim();
                if (headingText && headingText.length < 200) {
                    currentGroup = headingText
                        .replace(/^Download\s+/i, '')
                        .replace(/\s*[|–-]\s*\w+\.(com|net|org|blog)/i, '')
                        .trim();
                }
            }
            
            // If it's a link button
            if (tag === 'a') {
                const href = $(el).attr('href') || '';
                if (!href.startsWith('http')) return;
                
                const text = $(el).text().trim().toLowerCase();
                const cls = $(el).attr('class') || '';
                
                // Skip social/nav/ads links
                if (text.includes('telegram') || text.includes('whatsapp') || text.includes('vpn') || 
                    text.includes('home') || text.includes('about') || text.includes('privacy')) return;
                
                const isBtn = cls.includes('btn') || cls.includes('button') || cls.includes('maxbutton');
                const isShortener = href.includes('archives') || href.includes('?id=') || href.includes('leechpro') || href.includes('modpro');
                // Only treat text-based matching if it's genuinely clearly a download string without being a website tag
                const isDownloadText = (text.includes('episode') || text.includes('batch') || text.includes('zip') || text.includes('g-drive')) && !href.includes('/tag/');
                
                if (isBtn || isShortener || isDownloadText) {
                    const linkText = $(el).text().trim() || 'Download';
                    if (!groupMap.has(currentGroup)) groupMap.set(currentGroup, []);
                    groupMap.get(currentGroup)!.push({ server: linkText, url: href });
                }
            }
        });
        
        groupMap.forEach((links, title) => {
            const uniqueLinks = links.filter((v,i,a) => a.findIndex(t => t.url === v.url) === i);
            if (uniqueLinks.length > 0) {
                downloadGroups.push({ title, links: uniqueLinks });
            }
        });

        return {
             success: true,
             data: {
                 title,
                 imageUrl: img,
                 description,
                 downloadLinks: downloadGroups,
                 originalUrl: url
             }
        };

    } catch(err: any) {
         return { success: false, error: err.message };
    }
}
