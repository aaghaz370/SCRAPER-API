import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import { getAnimeSaltUI } from "./ui";
import { scrapeStreamData } from "./stream/route";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE_HEADERS = { "User-Agent": UA };

// ─── Types ───────────────────────────────────────────────────────────────────
interface AnimeItem {
  title: string;
  url: string;
  image: string;
  type: "series" | "movie" | "unknown";
}

interface Episode {
  epNumRaw: string;
  title: string;
  url: string;
  image: string;
}

interface Season {
  seasonName: string;
  episodes: Episode[];
}

interface StreamLink {
  language: string;
  link: string;
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function fixImage(src: string | undefined): string {
  if (!src) return "";
  if (src.startsWith("data:image")) return "";
  if (src.startsWith("//")) return "https:" + src;
  return src;
}

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, { headers: BASE_HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

// ─── Scrapers ─────────────────────────────────────────────────────────────────

/** Home: popular series + movies from the Toro chart widgets */
async function scrapeHome(baseUrl: string) {
  const html = await fetchPage(baseUrl);
  const $ = cheerio.load(html);

  function extractChart(selector: string, type: "series" | "movie"): AnimeItem[] {
    const items: AnimeItem[] = [];
    $(`${selector} .chart-item`).each((_, el) => {
      const $el = $(el);
      const title = $el.find(".chart-title").text().trim();
      const url = $el.find(".chart-poster").attr("href") || "";
      let image = fixImage(
        $el.find(".chart-poster img").attr("data-src") ||
        $el.find(".chart-poster img").attr("src")
      );
      if (title && url) items.push({ title, url, image, type });
    });
    return items;
  }

  // Also scrape article cards from the main homepage grid
  function extractGrid(): AnimeItem[] {
    const items: AnimeItem[] = [];
    $("article.item, article.post").each((_, el) => {
      const $el = $(el);
      const url = $el.find("a").first().attr("href") || "";
      const title =
        $el.find("h3, h2, .title a").first().text().trim() ||
        $el.find('a[title]').attr("title") || "";
      let image = fixImage(
        $el.find("img").attr("data-src") || $el.find("img").attr("src")
      );
      if (!title || !url || !url.includes("animesalt")) return;
      const type: "series" | "movie" | "unknown" =
        url.includes("/series/") ? "series" :
        url.includes("/movies/") || url.includes("/movie/") ? "movie" : "unknown";
      items.push({ title, url, image, type });
    });
    return items;
  }

  const popularSeries = extractChart("#torofilm_wdgt_popular-3-all", "series");
  const popularMovies = extractChart("#torofilm_wdgt_popular-5-all", "movie");
  const gridItems     = extractGrid();

  // Merge: prefer chart data; supplement with grid
  const allUrls = new Set([...popularSeries, ...popularMovies].map(i => i.url));
  const extra   = gridItems.filter(i => !allUrls.has(i.url));

  return {
    popularSeries: popularSeries.length ? popularSeries : extra.filter(i => i.type !== "movie").slice(0, 12),
    popularMovies: popularMovies.length ? popularMovies : extra.filter(i => i.type === "movie").slice(0, 12),
  };
}

/** Search */
async function scrapeSearch(baseUrl: string, query: string): Promise<AnimeItem[]> {
  const html = await fetchPage(`${baseUrl}/?s=${encodeURIComponent(query)}`);
  const $ = cheerio.load(html);
  const items: AnimeItem[] = [];

  $(".result-item, article.item, article.post, article").each((_, el) => {
    const $el = $(el);
    const url =
      $el.find("a").first().attr("href") ||
      $el.attr("href") || "";
    const title =
      $el.find("h3, h2, h4, .title a, .title").first().text().trim() ||
      $el.find('a[title]').attr("title") || "";
    let image = fixImage(
      $el.find("img").attr("data-src") || $el.find("img").attr("src")
    );
    if (!title || !url || !url.includes("animesalt")) return;
    const type: "series" | "movie" | "unknown" =
      url.includes("/series/") ? "series" :
      url.includes("/movies/") || url.includes("/movie/") ? "movie" : "unknown";
    items.push({ title, url, image, type });
  });

  return Array.from(new Map(items.map(i => [i.url, i])).values());
}

/** Details — series or movie page */
async function scrapeDetails(url: string) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const title = $("h1").first().text().trim();
  const synopsis = $(
    ".description p, .synopsis p, .description, .synopsis, [itemprop='description']"
  ).first().text().trim();
  let image = fixImage(
    $(".poster img, .cover img, .thumb img, [itemprop='image']").first().attr("src") ||
    $(".poster img, .cover img, .thumb img").first().attr("data-src")
  );
  if (!image) {
    // fallback to og:image
    image = fixImage($('meta[property="og:image"]').attr("content"));
  }
  const rating  = $(".imdb-rating, .rating, [class*='imdb']").first().text().trim();
  const qualities: string[] = [];
  const langs:    string[] = [];

  // Quality info from badges
  $("[class*='quality'], [class*='res'], .quality").each((_, el) => {
    const q = $(el).text().trim();
    if (q && q.length < 20) qualities.push(q);
  });
  $("[class*='lang'], [class*='audio'], .language").each((_, el) => {
    const l = $(el).text().trim();
    if (l && l.length < 40) langs.push(l);
  });

  const isMovie = url.includes("/movies/") || url.includes("/movie-") ||
    $("body").hasClass("single-movies") ||
    $("body").hasClass("movies");

  const seasons: Season[] = [];

  // Strategy A: .se-c season blocks (standard Toro theme)
  $(".se-c").each((_, el) => {
    const seasonName = $(el).find(".se-q .title").text().trim() ||
      $(el).find(".se-q").text().trim() || "Season";
    const episodes: Episode[] = [];
    $(el).find(".episodios li").each((_, ep) => {
      const epUrl   = $(ep).find("a").attr("href") || "";
      const epTitle = $(ep).find(".episodiotitle a, .title a").text().trim();
      const numRaw  = $(ep).find(".numerando, .num").text().trim();
      let epImg = fixImage($(ep).find("img").attr("data-src") || $(ep).find("img").attr("src"));
      if (epUrl) episodes.push({ epNumRaw: numRaw, title: epTitle, url: epUrl, image: epImg });
    });
    if (episodes.length) seasons.push({ seasonName, episodes });
  });

  // Strategy B: AJAX-loaded seasons with .season-btn or flat list
  if (!seasons.length) {
    const seasonMap = new Map<number, Episode[]>();

    const parseEpisodeLi = (ep: cheerio.Element) => {
      const epUrl   = $(ep).find("a").attr("href") || "";
      const epTitle = $(ep).find("h3, .title, h4, h2").first().text().trim();
      const numRaw  = $(ep).find(".numerando, .num").first().text().trim();
      let epImg = fixImage($(ep).find("img").attr("data-src") || $(ep).find("img").attr("src"));

      if (!epUrl) return;
      const mSeason = epUrl.match(/-(\d+)x\d+\/?$/);
      const sNum = mSeason ? parseInt(mSeason[1]) : 1;
      if (!seasonMap.has(sNum)) seasonMap.set(sNum, []);
      seasonMap.get(sNum)!.push({ epNumRaw: numRaw, title: epTitle, url: epUrl, image: epImg });
    };

    // Parse the initially loaded episodes
    $("#episode_by_temp li, .episodes li").each((_, ep) => parseEpisodeLi(ep));

    // Check for other seasons via AJAX
    const seasonBtns = $(".season-btn").map((_, el) => ({
      season: parseInt($(el).attr("data-season") || "0"),
      post: $(el).attr("data-post") || "",
      text: $(el).text().trim()
    })).get().filter(b => b.season > 0 && b.post);

    if (seasonBtns.length > 0) {
      // Find which seasons we haven't loaded yet
      const missingBtns = seasonBtns.filter(b => !seasonMap.has(b.season));
      
      if (missingBtns.length > 0) {
        // Fetch them concurrently via wp-admin ajax
        await Promise.all(missingBtns.map(async (btn) => {
          try {
            const ajaxUrl = `https://animesalt.ac/wp-admin/admin-ajax.php?action=action_select_season&season=${btn.season}&post=${btn.post}`;
            const res = await fetch(ajaxUrl, { headers: { "User-Agent": UA } });
            if (res.ok) {
              const html = await res.text();
              const $ajax = cheerio.load(html);
              $ajax("li").each((_, ep) => {
                const epUrl   = $ajax(ep).find("a").attr("href") || "";
                const epTitle = $ajax(ep).find("h3, .title, h4, h2").first().text().trim();
                const numRaw  = $ajax(ep).find(".numerando, .num").first().text().trim();
                let epImg = fixImage($ajax(ep).find("img").attr("data-src") || $ajax(ep).find("img").attr("src"));
          
                if (!epUrl) return;
                const mSeason = epUrl.match(/-(\d+)x\d+\/?$/) ? parseInt(epUrl.match(/-(\d+)x\d+\/?$/)![1]) : btn.season;
                if (!seasonMap.has(mSeason)) seasonMap.set(mSeason, []);
                seasonMap.get(mSeason)!.push({ epNumRaw: numRaw, title: epTitle, url: epUrl, image: epImg });
              });
            }
          } catch (e) {
            console.error("AJAX season error", e);
          }
        }));
      }
    }

    const sorted = Array.from(seasonMap.entries()).sort((a, b) => a[0] - b[0]);
    sorted.forEach(([sNum, eps]) => {
      // Try to find the clean season name from buttons, fallback to "Season X"
      const btn = seasonBtns.find(b => b.season === sNum);
      const sName = btn?.text || `Season ${sNum}`;
      seasons.push({ seasonName: sName, episodes: eps });
    });
  }

  return {
    title,
    synopsis,
    image,
    rating,
    qualities: [...new Set(qualities)].filter(Boolean),
    langs:     [...new Set(langs)].filter(Boolean),
    isMovie,
    seasons,
    _sourceUrl: url,
  };
}

/** Stream info from an episode page */
async function scrapeStream(url: string) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const multiLangStreams: StreamLink[] = [];
  const iframes: string[] = [];

  // ── Approach 1: player.php?data=Base64JSON ──
  const playerMatch = /player\.php\?data=([A-Za-z0-9%_\-+=]+)/.exec(html);
  if (playerMatch) {
    try {
      const decoded = decodeURIComponent(playerMatch[1]);
      const parsed  = JSON.parse(Buffer.from(decoded, "base64").toString("utf8"));
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (p.link) multiLangStreams.push({ language: p.language || "Unknown", link: p.link });
        });
      }
    } catch (_) {}
  }

  // ── Approach 2: any iframes on page ──
  $("iframe").each((_, el) => {
    let src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (!src) return;
    if (src.startsWith("//")) src = "https:" + src;
    if (src.includes("youtube.com") || src.includes("google") || src.includes("cloudflare")) return;
    iframes.push(src);
  });

  // Qualities / langs badges (if any exist on ep page)
  const qualities: string[] = [];
  const langs:    string[] = [];
  $("[class*='quality']").each((_, el) => { const q = $(el).text().trim(); if (q) qualities.push(q); });
  $("[class*='lang'], [class*='audio']").each((_, el) => { const l = $(el).text().trim(); if (l) langs.push(l); });

  return {
    multiLangStreams,
    iframes:   [...new Set(iframes)],
    qualities: [...new Set(qualities)].filter(Boolean),
    langs:     [...new Set(langs)].filter(Boolean),
    episodeUrl: url,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "ui";

  // ── Serve Web UI ──
  if (action === "ui" || action === "") {
    return new NextResponse(getAnimeSaltUI(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const baseUrl = await getBaseUrl("animesalt");

    // ── Home ──
    if (action === "home") {
      const data = await scrapeHome(baseUrl);
      return NextResponse.json({ success: true, data });
    }

    // ── Search ──
    if (action === "search") {
      const query = searchParams.get("q") || searchParams.get("query") || "";
      if (!query) return NextResponse.json({ error: "Missing q" }, { status: 400 });
      const data = await scrapeSearch(baseUrl, query);
      return NextResponse.json({ success: true, data, total: data.length });
    }

    // ── Details ──
    if (action === "details") {
      const url = searchParams.get("url");
      if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
      const data = await scrapeDetails(url);
      return NextResponse.json({ success: true, data });
    }

    // ── Stream ── returns raw + proxied m3u8 URL
    if (action === "stream") {
      const url = searchParams.get("url");
      if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
      const data = await scrapeStreamData(url);
      const host = req.headers.get("host") || "localhost:9090";
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const proxiedM3u8 = `${proto}://${host}/api/animesalt?action=proxy&url=` + encodeURIComponent(data.masterM3u8);
      return NextResponse.json({ success: true, data: { ...data, proxiedM3u8 } });
    }

    // ── HLS Proxy ── fetches m3u8/ts server-side and rewrites segment URLs through our proxy
    if (action === "proxy") {
      const targetUrl = searchParams.get("url");
      if (!targetUrl) return NextResponse.json({ error: "Missing url" }, { status: 400 });

      const upstreamOrigin = new URL(targetUrl);
      const referer = `${upstreamOrigin.protocol}//${upstreamOrigin.hostname}/`;
      const upstream = await fetch(targetUrl, {
        headers: { "User-Agent": UA, "Referer": referer },
      });

      if (!upstream.ok) {
        return new NextResponse(`Upstream ${upstream.status}`, { status: upstream.status });
      }

      const ct = upstream.headers.get("content-type") || "";
      const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "no-store",
      };
      const host = req.headers.get("host") || "localhost:9090";
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const proxyBase = `${proto}://${host}/api/animesalt?action=proxy&url=`;

      // ⚠️ KEY FIX: as-cdn21.top sub-playlist URLs have NO .m3u8 extension and the
      // Content-Type may not say mpegurl. We MUST detect m3u8 by peeking the response
      // body for the #EXTM3U magic — otherwise segment URLs won't be rewritten!
      const buf = await upstream.arrayBuffer();
      const header7 = Buffer.from(buf).slice(0, 7).toString("ascii");
      const isM3u8 = targetUrl.includes(".m3u8") ||
        ct.includes("mpegurl") ||
        ct.includes("x-mpegURL") ||
        header7.startsWith("#EXTM3U");

      if (isM3u8) {
        const rawText = Buffer.from(buf).toString("utf8");
        const m3u8Base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

        // Helper: resolve + proxy a single URL
        const proxyUri = (uri: string): string => {
          try {
            const abs = uri.startsWith("http") ? uri : new URL(uri, m3u8Base).href;
            return proxyBase + encodeURIComponent(abs);
          } catch {
            return uri;
          }
        };

        const rewritten = rawText.split("\n").map((line) => {
          const t = line.trim();
          if (!t) return line;

          // ── Non-directive lines (segment paths, sub-playlist paths) ──
          if (!t.startsWith("#")) {
            return proxyUri(t);
          }

          // ── Directive lines: rewrite URI="..." attributes ──
          // Affects: #EXT-X-MEDIA:URI="...", #EXT-X-KEY:URI="...", #EXT-X-MAP:URI="..."
          // These contain audio track playlists, AES-128 key URIs, init segments, etc.
          if (t.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              return `URI="${proxyUri(uri)}"`;
            });
          }

          return line;
        }).join("\n");

        return new NextResponse(rewritten, {
          headers: { ...cors, "Content-Type": "application/vnd.apple.mpegurl" },
        });
      }

      // Binary passthrough: ts segments, aac audio tracks, AES key files
      const rh = new Headers(cors);
      if (ct) rh.set("Content-Type", ct);
      const cl = upstream.headers.get("content-length");
      if (cl) rh.set("Content-Length", cl);
      return new NextResponse(buf, { status: 200, headers: rh });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error("[animesalt]", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
