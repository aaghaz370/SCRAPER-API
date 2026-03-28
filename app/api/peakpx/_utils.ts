export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

export function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── 100% Free Cloudflare Bypass using DDG Image Proxy 🔥 ────────────
export async function fetchDDGImages(query: string, page = 1) {
  const headers = {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  // 1. Get VQD token 
  // DDG uses magic tokens for image searches to stop naive bots, we parse it from HTML.
  const authUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`;
  const res1 = await fetch(authUrl, { headers });
  const html = await res1.text();
  
  const vqdMatch = html.match(/vqd=["']?([^"'\s>]+)["']?/);
  if (!vqdMatch) {
    throw new Error("DDG VQD token missing. Scraper blocked temporarily by DDG.");
  }
  const vqd = vqdMatch[1];

  // 2. Fetch Images internally 
  const reqStart = (page - 1) * 35; // ~35 items per page
  const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=${page > 1 ? "-1" : "1"}&s=${reqStart}`;
  
  const res2 = await fetch(apiUrl, { headers });
  if (!res2.ok) throw new Error("DDG Image API returned error: " + res2.status);
  
  const data = await res2.json();
  if (!data || !data.results) return [];
  
  // Format precisely to standard PeakPX API response expected
  return data.results.map((r: any) => {
    const imageUrl = r.image;
    const pageUrl = r.url; 
    
    // Attempt extracting peakpx specific slug
    let slug = pageUrl.split("/").filter(Boolean).pop();
    if (slug?.includes("?")) slug = slug.split("?")[0];
    if (slug?.includes("#")) slug = slug.split("#")[0];

    // Some images fallback to standard 1920x1080 if not found
    let resolution = "1920x1080";
    if (r.width && r.height) {
      resolution = `${r.width}x${r.height}`;
    } else {
      const resMatch = r.title.match(/(\d{3,5})x(\d{3,5})/i);
      if (resMatch) resolution = resMatch[0];
    }

    const title = r.title.replace(/\|?\s*Peakpx?/i, "").replace(/wallpaper/i, "").trim() || slug?.replace(/-/g," ") || "Wallpaper";

    return {
      id: slug || encodeURIComponent(imageUrl),
      slug: slug || "",
      title,
      pageUrl,
      thumbnailUrl: r.thumbnail, // DDG's fast compressed thumbnail
      imageUrl,                  // Peakpx CDN full resolution image (w0.peakpx.com)
      downloadUrl: imageUrl,     // Peakpx CDN full resolution (No CAPTCHA here!)
      resolution,
      width: r.width,
      height: r.height,
    };
  });
}
