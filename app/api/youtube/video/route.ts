import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── YouTube Video Info – Vercel Optimized Scraper ───────────────────────────
// Built for maximum stability on Datacenter IPs without 3rd party APIs.
// Primary Strategy: Mobile Web Watch Page (m.youtube.com) yields 4K adaptive formats
// without botguard captchas, poTokens, or signature ciphers.
// Secondary Strategy: TVHTML5 InnerTube client as a robust fallback.

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

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const MWEB_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const TV_UA = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36; SMART-TV; Tizen 4.0";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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
    // Decrypt cipher logic is mostly bypassed by using mweb/TV clients,
    // but we keep the extraction logic just in case structural URLs are needed.
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

  const qualityLabel = fmt.qualityLabel || (fmt.audioQuality ? fmt.audioQuality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");

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

// ─── Balanced JSON Extractor ──────────────────────────────────────────────────
function extractBalanced(src: string, marker: string): any | null {
  let searchStart = 0;
  while (searchStart < src.length) {
    const idx = src.indexOf(marker, searchStart);
    if (idx === -1) return null;
    const startBrace = src.indexOf("{", idx);

    // If there's more than 30 chars between marker and {, probably the wrong one (like = null;)
    if (startBrace === -1 || startBrace - idx > 30) {
      searchStart = idx + marker.length;
      continue;
    }

    let depth = 0, inStr: string | false = false, esc = false;
    for (let i = startBrace; i < src.length; i++) {
      const ch = src[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"' || ch === "'" || ch === "`") {
        if (!inStr) { inStr = ch; }
        else if (inStr === ch) { inStr = false; }
        continue;
      }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const slice = src.slice(startBrace, i + 1);
          try {
            return JSON.parse(slice);
          } catch (e) {
            searchStart = idx + marker.length;
            break; // Break the inner loop, continue the while-loop
          }
        }
      }
    }
  }
  return null;
}

// ─── Strategy A: Primary Mobile Web Watch Page (Vercel bypass) ────────────────
async function fetchFromMobileWatchPage(videoId: string): Promise<any> {
  const url = `https://m.youtube.com/watch?v=${videoId}&hl=en&gl=US`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": MWEB_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cookie": "CONSENT=YES+1",
    },
  });

  if (!res.ok) throw new Error(`MWEB Watch page: ${res.status}`);
  const html = await res.text();

  let parsed = extractBalanced(html, "ytInitialPlayerResponse");
  if (!parsed) {
    const rawMatch = html.match(/ytInitialPlayerResponse\s*=\s*({(?:[^{}]|(?:\{[^{}]*\}))*playabilityStatus.*?\})/);
    if (rawMatch) {
        try { parsed = JSON.parse(rawMatch[1]); } catch { /* ignore */ }
    }
  }
  
  if (parsed?.videoDetails) return parsed;
  throw new Error("ytInitialPlayerResponse not found in MWEB");
}

// ─── Strategy B: Fallback TV HTML5 Client ─────────────────────────────────────
async function fetchTVClient(videoId: string): Promise<any> {
  const body = {
    context: {
      client: {
        clientName: "TVHTML5",
        clientVersion: "7.20230419.01.00",
        userAgent: TV_UA,
        hl: "en",
        gl: "US"
      }
    },
    videoId,
    playbackContext: { contentPlaybackContext: { html5Preference: "HTML5_PREF_WANTS" } }
  };

  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": TV_UA },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`TV client failed: ${res.status}`);
  return await res.json();
}

// ─── Metadata fallback ────────────────────────────────────────────────────────
async function fetchMetadataOnly(videoId: string): Promise<Partial<VideoInfo>> {
  const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
    headers: { "User-Agent": DESKTOP_UA },
  });
  if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);
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

// ─── Data Builder ─────────────────────────────────────────────────────────────
function buildVideoInfo(videoId: string, playerData: any, tvData?: any): VideoInfo {
  const vd = playerData?.videoDetails || tvData?.videoDetails || {};
  const mf = playerData?.microformat?.playerMicroformatRenderer || tvData?.microformat?.playerMicroformatRenderer || {};

  const durationSeconds = parseInt(vd.lengthSeconds || "0");
  const thumbnails: any[] = vd.thumbnail?.thumbnails || [];
  const thumbnail = thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  let rawMuxed: any[] = [];
  let rawAdaptive: any[] = [];

  // Combine and deduplicate formats from both sources
  const seenItags = new Set<number>();
  
  const addFormats = (sd: any) => {
    if (!sd) return;
    (sd.formats || []).forEach((f: any) => {
        if (!seenItags.has(f.itag)) { seenItags.add(f.itag); rawMuxed.push(f); }
    });
    (sd.adaptiveFormats || []).forEach((f: any) => {
        if (!seenItags.has(f.itag)) { seenItags.add(f.itag); rawAdaptive.push(f); }
    });
  };

  addFormats(playerData?.streamingData);
  addFormats(tvData?.streamingData);

  const muxedFormats = rawMuxed.map((f) => parseFormat(f, "muxed")).filter(Boolean) as StreamFormat[];
  const adaptiveFormats = rawAdaptive.map((f) => parseFormat(f, "adaptive")).filter(Boolean) as StreamFormat[];

  // Highest quality first
  const allFormats = [...muxedFormats, ...adaptiveFormats].sort((a, b) => b.bitrate - a.bitrate);

  // Highest resolution first
  const videoOnlyFormats = adaptiveFormats
    .filter((f) => f.hasVideo && !f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  // Highest bitrate first
  const audioOnlyFormats = adaptiveFormats
    .filter((f) => f.hasAudio && !f.hasVideo)
    .sort((a, b) => b.bitrate - a.bitrate);

  const videoFormats = muxedFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("videoId");

    if (!id) {
      return NextResponse.json({ error: "Missing video ID. Use ?id=VIDEO_ID" }, { status: 400 });
    }

    let videoId = id.trim();
    const urlMatch = videoId.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) videoId = urlMatch[1];

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json({ error: "Invalid YouTube video ID (must be 11 chars)" }, { status: 400 });
    }

    let mwebData: any = null;
    let tvData: any = null;

    // Strategy 1: Mobile Web (highest success rate on Vercel without captchas, yields 4K format strings directly)
    try {
      mwebData = await fetchFromMobileWatchPage(videoId);
    } catch (e) {
      console.warn("[youtube/video] MWEB fetch failed:", (e as Error).message);
    }

    // Strategy 2: TVHTML5 (Solid fallback, usually gives direct streams)
    try {
      tvData = await fetchTVClient(videoId);
      if (tvData?.playabilityStatus?.status === 'LOGIN_REQUIRED') {
         console.warn("[youtube/video] TVHTML5 requires login for this video.");
         tvData = null;
      }
    } catch (e) {
      console.warn("[youtube/video] TV fetch failed:", (e as Error).message);
    }

    if (!mwebData && !tvData) {
      console.warn("[youtube/video] All stream extractions failed, falling back to oEmbed metadata");
      const meta = await fetchMetadataOnly(videoId);
      if (meta.title) {
         return NextResponse.json({ success: true, data: meta });
      }
      throw new Error("Unable to extract video details through any strategy");
    }

    const info = buildVideoInfo(videoId, mwebData, tvData);
    
    if (info.formats.length === 0 && info.title === "") {
        throw new Error("Extraction returned empty video details");
    }

    return NextResponse.json({ success: true, data: info });

  } catch (error) {
    console.error("[youtube/video]", error);
    return NextResponse.json(
      {
        error: "Video info extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
