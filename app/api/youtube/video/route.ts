import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Run on Cloudflare IPs instead of AWS Datacenter (bypasses bot block)
export const dynamic = "force-dynamic";

// ─── YouTube Video Info ───────────────────────────────────────────────────────
// Strategy: Scrape m.youtube.com (Mobile Web) - works strictly on Vercel Edge.
// Scans ALL occurrences of ytInitialPlayerResponse to find the real JSON block
// Fallback: TVHTML5 InnerTube client.

export interface StreamFormat {
  itag: number;
  quality: string;
  qualityLabel: string;
  mimeType: string;
  contentType: "video" | "audio" | "video+audio";
  bitrate: number;
  width?: number;
  height?: number;
  fps?: number;
  audioQuality?: string;
  audioSampleRate?: string;
  approxDurationMs: string;
  contentLength?: string;
  url: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  channelName: string;
  channelId: string;
  viewCount: string;
  publishDate: string;
  isLive: boolean;
  isPrivate: boolean;
  formats: StreamFormat[];
  videoFormats: StreamFormat[];
  videoOnlyFormats: StreamFormat[];
  audioOnlyFormats: StreamFormat[];
  bestVideoUrl: string;
  bestAudioUrl: string;
}

const MWEB_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const TV_UA =
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36; SMART-TV; Tizen 4.0";
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseFormat(fmt: any, type: "adaptive" | "muxed"): StreamFormat | null {
  if (!fmt) return null;

  let streamUrl = fmt.url || "";
  if (!streamUrl && (fmt.signatureCipher || fmt.cipher)) {
    const raw = fmt.signatureCipher || fmt.cipher;
    const params = new URLSearchParams(raw);
    const baseUrl = params.get("url") || "";
    const sig = params.get("s") || "";
    const sp = params.get("sp") || "signature";
    streamUrl = sig ? `${baseUrl}&${sp}=${encodeURIComponent(sig)}` : baseUrl;
  }
  if (!streamUrl) return null;

  const mimeType: string = fmt.mimeType || "";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isMuxed = type === "muxed";
  const hasVideo = isVideo || isMuxed;
  const hasAudio = isAudio || isMuxed;

  let contentType: "video" | "audio" | "video+audio" = "video+audio";
  if (isVideo && !isMuxed) contentType = "video";
  else if (isAudio) contentType = "audio";

  const qualityLabel =
    fmt.qualityLabel ||
    (fmt.audioQuality ? fmt.audioQuality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
  let quality = qualityLabel;
  if (!quality) {
    if (isAudio) quality = `${Math.round((fmt.bitrate || 0) / 1000)}kbps audio`;
    else quality = fmt.quality || "unknown";
  }

  return {
    itag: fmt.itag,
    quality,
    qualityLabel,
    mimeType,
    contentType,
    bitrate: fmt.bitrate || fmt.averageBitrate || 0,
    width: fmt.width,
    height: fmt.height,
    fps: fmt.fps,
    audioQuality: fmt.audioQuality,
    audioSampleRate: fmt.audioSampleRate,
    approxDurationMs: fmt.approxDurationMs || "0",
    contentLength: fmt.contentLength,
    url: streamUrl,
    hasVideo,
    hasAudio,
  };
}

// ─── Robust JSON extractor – skips "= null" and other non-object occurrences ──
function extractPlayerResponse(html: string): any | null {
  const MARKER = "ytInitialPlayerResponse";
  let searchStart = 0;

  while (searchStart < html.length) {
    const idx = html.indexOf(MARKER, searchStart);
    if (idx === -1) return null;

    const startBrace = html.indexOf("{", idx);
    // If the { is more than 35 chars away, this occurrence is "= null;" or similar → skip
    if (startBrace === -1 || startBrace - idx > 35) {
      searchStart = idx + MARKER.length;
      continue;
    }

    // Walk balanced braces — only handle double-quote strings (JSON-valid)
    let depth = 0, inStr = false, esc = false;
    for (let i = startBrace; i < Math.min(html.length, startBrace + 6_000_000); i++) {
      const ch = html[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(html.slice(startBrace, i + 1));
            // Only accept if it contains real video data
            if (parsed?.videoDetails?.videoId) return parsed;
          } catch {
            /* try next occurrence */
          }
          break; // break inner for-loop, continue searching
        }
      }
    }
    searchStart = idx + MARKER.length;
  }
  return null;
}

// ─── Strategy 1: MWEB HTML scrape ────────────────────────────────────────────
async function fetchFromMWEB(videoId: string): Promise<any> {
  const url = `https://m.youtube.com/watch?v=${videoId}&hl=en&gl=US`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": MWEB_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cookie": "CONSENT=YES+1; SOCS=CAESEwgDEgk0OTcxMzI3NTIaAmVuIAEaBgiAlLKxBg==",
    },
  });
  if (!res.ok) throw new Error(`MWEB: HTTP ${res.status}`);
  const html = await res.text();
  const parsed = extractPlayerResponse(html);
  if (!parsed) throw new Error("ytInitialPlayerResponse not found in MWEB");
  return parsed;
}

// ─── Strategy 2: TVHTML5 InnerTube ───────────────────────────────────────────
async function fetchTVClient(videoId: string): Promise<any> {
  const body = {
    context: {
      client: {
        clientName: "TVHTML5",
        clientVersion: "7.20230419.01.00",
        userAgent: TV_UA,
        hl: "en",
        gl: "US",
      },
    },
    videoId,
    playbackContext: {
      contentPlaybackContext: { html5Preference: "HTML5_PREF_WANTS" },
    },
  };
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": TV_UA },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`TVHTML5: HTTP ${res.status}`);
  const data = await res.json();
  const status = data?.playabilityStatus?.status;
  if (status === "LOGIN_REQUIRED" || status === "UNPLAYABLE") {
    throw new Error(`TVHTML5: ${status}`);
  }
  return data;
}

// ─── Strategy 3: oEmbed metadata only ────────────────────────────────────────
async function fetchOEmbed(videoId: string): Promise<Partial<VideoInfo>> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  );
  if (!res.ok) throw new Error(`oEmbed: HTTP ${res.status}`);
  const d = await res.json();
  return {
    videoId,
    title: d.title || "",
    channelName: d.author_name || "",
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    duration: "0:00",
    durationSeconds: 0,
    description: "",
    channelId: "",
    viewCount: "0",
    publishDate: "",
    isLive: false,
    isPrivate: false,
    formats: [],
    videoFormats: [],
    videoOnlyFormats: [],
    audioOnlyFormats: [],
    bestVideoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    bestAudioUrl: "",
  };
}

// ─── Build VideoInfo from player data ────────────────────────────────────────
function buildVideoInfo(videoId: string, data: any): VideoInfo {
  const vd = data?.videoDetails || {};
  const mf = data?.microformat?.playerMicroformatRenderer || {};
  const sd = data?.streamingData || {};

  const durationSeconds = parseInt(vd.lengthSeconds || "0");
  const thumbnails: any[] = vd.thumbnail?.thumbnails || [];
  const thumbnail =
    thumbnails[thumbnails.length - 1]?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const rawMuxed: any[] = sd.formats || [];
  const rawAdaptive: any[] = sd.adaptiveFormats || [];

  const muxed = rawMuxed
    .map((f) => parseFormat(f, "muxed"))
    .filter(Boolean) as StreamFormat[];
  const adaptive = rawAdaptive
    .map((f) => parseFormat(f, "adaptive"))
    .filter(Boolean) as StreamFormat[];

  const allFormats = [...muxed, ...adaptive].sort(
    (a, b) => b.bitrate - a.bitrate
  );
  const videoFormats = muxed.sort((a, b) => (b.height || 0) - (a.height || 0));
  const videoOnlyFormats = adaptive
    .filter((f) => f.hasVideo && !f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  const audioOnlyFormats = adaptive
    .filter((f) => f.hasAudio && !f.hasVideo)
    .sort((a, b) => b.bitrate - a.bitrate);

  return {
    videoId: vd.videoId || videoId,
    title: vd.title || "",
    description: vd.shortDescription || "",
    thumbnail,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    channelName: vd.author || "",
    channelId: vd.channelId || "",
    viewCount: vd.viewCount || "0",
    publishDate: mf.publishDate || mf.uploadDate || "",
    isLive: !!vd.isLiveContent,
    isPrivate: !!vd.isPrivate,
    formats: allFormats,
    videoFormats,
    videoOnlyFormats,
    audioOnlyFormats,
    bestVideoUrl: videoFormats[0]?.url || videoOnlyFormats[0]?.url || "",
    bestAudioUrl: audioOnlyFormats[0]?.url || "",
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  let playerData: any = null;

  try {
    playerData = await fetchFromMWEB(videoId);
    console.log(`[video-edge] MWEB OK | formats:${playerData?.streamingData?.formats?.length || 0} adaptive:${playerData?.streamingData?.adaptiveFormats?.length || 0}`);
  } catch (e) {
    console.warn("[video-edge] MWEB failed:", (e as Error).message);
  }

  if (!playerData?.streamingData?.adaptiveFormats?.length) {
    try {
      const tv = await fetchTVClient(videoId);
      if (tv?.streamingData?.adaptiveFormats?.length) {
        playerData = playerData
          ? { ...tv, videoDetails: playerData.videoDetails || tv.videoDetails }
          : tv;
        console.log(`[video-edge] TVHTML5 OK | adaptive:${tv.streamingData.adaptiveFormats.length}`);
      }
    } catch (e) {
      console.warn("[video-edge] TVHTML5 failed:", (e as Error).message);
    }
  }

  if (!playerData?.videoDetails) {
    console.warn("[video-edge] All strategies failed, using oEmbed metadata");
    return (await fetchOEmbed(videoId)) as VideoInfo;
  }

  return buildVideoInfo(videoId, playerData);
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("videoId");

    if (!id) {
      return NextResponse.json(
        { error: "Missing video ID. Use ?id=VIDEO_ID" },
        { status: 400 }
      );
    }

    let videoId = id.trim();
    const urlMatch = videoId.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (urlMatch) videoId = urlMatch[1];

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json(
        { error: "Invalid YouTube video ID (must be 11 chars)" },
        { status: 400 }
      );
    }

    const info = await fetchVideoInfo(videoId);
    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error("[youtube/video-edge]", error);
    return NextResponse.json(
      {
        error: "Video extraction blocked by anti-bot. Try using Edge runtime.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
