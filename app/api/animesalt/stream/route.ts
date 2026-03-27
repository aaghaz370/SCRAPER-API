import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PLAY_SERVER = "https://as-cdn21.top";

interface TrackInfo {
  kind: string;
  file: string;
  label: string;
  language?: string;
  default?: boolean;
}

// ─── Main exported function used by route.ts AND this sub-route ──────────────
export async function scrapeStreamData(episodeUrl: string) {
  // 1. Fetch the episode page
  const epRes = await fetch(episodeUrl, {
    headers: {
      "User-Agent": UA,
      "Referer": "https://animesalt.ac/",
    },
  });
  if (!epRes.ok) throw new Error(`Episode page fetch failed: ${epRes.status}`);
  const html = await epRes.text();
  const $ = cheerio.load(html);

  // 2. Find the Play server (as-cdn*.top) iframe — it's SERVER 1 (not Abyss)
  let playHash: string | null = null;
  let playHost: string = "https://as-cdn21.top"; // fallback

  $("iframe").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const match = src.match(/(https:\/\/as-cdn\d+\.top)\/video\/([a-f0-9]+)/i);
    if (match) {
      playHost = match[1];
      playHash = match[2];
      return false; // stop iteration
    }
  });

  if (!playHash) {
    throw new Error("Play server iframe (as-cdn*.top) not found on page.");
  }

  // 3. Call FirePlayer API to get the signed master.m3u8 on the correct host
  const playerPageUrl = `${playHost}/video/${playHash}`;
  const apiRes = await fetch(
    `${playHost}/player/index.php?data=${playHash}&do=getVideo`,
    {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Referer": playerPageUrl,
        "Origin": playHost,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `hash=${playHash}&r=${encodeURIComponent(playerPageUrl)}`,
    }
  );

  if (!apiRes.ok) throw new Error(`FirePlayer API failed: ${apiRes.status}`);
  const data = await apiRes.json();

  // 4. Extract master HLS URL and other metadata
  const masterM3u8: string = data.videoSource || data.securedLink || "";
  const isHls: boolean = !!data.hls;
  const thumbnail: string = data.videoImage || "";
  const downloadLinks: string[] = data.downloadLinks || [];

  // 5. Also extract subtitle tracks from the player page script
  const tracks: TrackInfo[] = [];
  const subtitleVar = html.match(/var playerjsSubtitle = "([^"]+)"/);
  if (subtitleVar) {
    // Format: "[Lang1]url1[Lang2]url2..."
    const raw = subtitleVar[1];
    const parts = raw.match(/\[([^\]]+)\](https?:\/\/[^\[]+)/g) || [];
    parts.forEach((part) => {
      const m = part.match(/\[([^\]]+)\](https?:\/\/[^\s\[]+)/);
      if (m) {
        tracks.push({
          kind: "captions",
          file: m[2].trim(),
          label: m[1].trim(),
          language: m[1].toLowerCase().slice(0, 3),
          default: m[1].toLowerCase().includes("eng"),
        });
      }
    });
  }

  // 6. Parse the decoded FirePlayer config for additional track info
  const evalBlock = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]+?\}\)\)/);
  let decodedTracks: TrackInfo[] = [];
  if (evalBlock) {
    try {
      const decoderFn = evalBlock[0].replace(/^eval\(/, "(").replace(/\)$/, ")");
      const decoded: string = eval(decoderFn);
      const tracksMatch = decoded.match(/"tracks":\s*(\[[^\]]+\])/);
      if (tracksMatch) {
        decodedTracks = JSON.parse(tracksMatch[1]);
      }
    } catch (_) {}
  }

  const allTracks = [
    ...decodedTracks.filter((t) => t.kind === "captions"),
    ...tracks,
  ];
  const uniqueTracks = Array.from(
    new Map(allTracks.map((t) => [t.file, t])).values()
  );

  return {
    hash: playHash,
    masterM3u8,
    isHls,
    thumbnail,
    downloadLinks,
    tracks: uniqueTracks,
    playerReferer: playerPageUrl,
    serverName: "Play (FirePlayer)",
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const data = await scrapeStreamData(url);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[animesalt/stream]", error);
    return NextResponse.json(
      {
        error: "Stream extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
