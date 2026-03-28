import { NextRequest, NextResponse } from "next/server";
import { Innertube, UniversalCache } from "youtubei.js";
import { YOUTUBE_COOKIES } from "../cookies";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapFormat(f: any): StreamFormat {
  const mimeType = f.mime_type || "";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const hasVideo = !!f.has_video;
  const hasAudio = !!f.has_audio;

  let contentType: "video" | "audio" | "video+audio" = "video+audio";
  if (hasVideo && !hasAudio) contentType = "video";
  else if (hasAudio && !hasVideo) contentType = "audio";

  const qualityLabel =
    f.quality_label ||
    (f.audio_quality ? f.audio_quality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
    
  let quality = qualityLabel;
  if (!quality) {
    if (hasAudio && !hasVideo) quality = `${Math.round((f.bitrate || 0) / 1000)}kbps audio`;
    else quality = f.quality || "unknown";
  }

  // natively deciphers URL if needed
  let url = f.url || "";
  if (!url && f.decipher) {
    try {
      url = f.decipher();
    } catch {
      url = "";
    }
  }

  return {
    itag: f.itag || 0,
    quality,
    qualityLabel,
    mimeType,
    contentType,
    bitrate: f.bitrate || f.average_bitrate || 0,
    width: f.width,
    height: f.height,
    fps: f.fps,
    audioQuality: f.audio_quality,
    audioSampleRate: f.audio_sample_rate?.toString(),
    approxDurationMs: f.approx_duration_ms?.toString() || "0",
    contentLength: f.content_length?.toString(),
    url,
    hasVideo,
    hasAudio,
  };
}

let ytInstance: Innertube | null = null;
async function getYT() {
  if (!ytInstance) {
    const cookie = process.env.YOUTUBE_COOKIE || YOUTUBE_COOKIES || "";
    const fetchOptions: any = {};
    if (cookie) {
      fetchOptions.headers = {
        Cookie: cookie,
      };
    }

    ytInstance = await Innertube.create({
      cookie: cookie,
      generate_session_locally: true,
      cache: new UniversalCache(false),
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const customInit = { ...init };
        if (cookie) {
          customInit.headers = {
            ...customInit.headers,
            Cookie: cookie,
          };
        }
        return fetch(input, customInit);
      }
    });
  }
  return ytInstance;
}

// Balances braces for extracting raw JSON objects from HTML
function extractJson(src: string, marker: string): any | null {
  const idx = src.indexOf(marker);
  if (idx === -1) return null;
  const start = src.indexOf("{", idx);
  if (start === -1) return null;
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < Math.min(src.length, start + 5_000_000); i++) {
    const ch = src[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) {
      try { return JSON.parse(src.slice(start, i + 1)); } catch { return null; }
    }}
  }
  return null;
}

// Robust fallback raw HTML scraper
async function fetchFallbackHTML(videoId: string) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.youtube.com/"
      }
    });
    const html = await res.text();
    const data = extractJson(html, "var ytInitialPlayerResponse =") || extractJson(html, "ytInitialPlayerResponse =");
    if (!data) return null;

    if (data.playabilityStatus?.status === "LOGIN_REQUIRED" || data.playabilityStatus?.status === "UNPLAYABLE") {
      throw new Error("Embedded fallback login required or unplayable");
    }

    if (!data.streamingData) return null;

    // Mimic InnerTube object structure wrapper
    return {
      basic_info: data.videoDetails,
      streaming_data: data.streamingData
    };
  } catch (err) {
    return null;
  }
}

async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  // 1. STRATEGY: Try pure HTML fetch mimicking a web crawler (Extremely high Vercel success rate)
  try {
    console.log(`[video] Attempting GoogleBot HTML fast-fetch bypass for ${videoId}...`);
    const fallbackData = await fetchFallbackHTML(videoId);
    if (fallbackData && fallbackData.streaming_data) {
      const { basic_info, streaming_data } = fallbackData;
      
      const rawMuxed = streaming_data.formats || [];
      const rawAdaptive = streaming_data.adaptiveFormats || [];
      
      const fallbackMapFormat = (f: any): StreamFormat => {
        const isVideo = f.mimeType?.includes("video/");
        const isAudio = f.mimeType?.includes("audio/");
        const hasVideo = !!isVideo || !!f.width;
        const hasAudio = !!isAudio || !!f.audioQuality;
  
        let qualityLabel = f.qualityLabel || (f.audioQuality ? f.audioQuality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
        let quality = qualityLabel || f.quality || "unknown";
        
        let contentType: "video" | "audio" | "video+audio" = "video+audio";
        if (hasVideo && !hasAudio) contentType = "video";
        else if (hasAudio && !hasVideo) contentType = "audio";
  
        let url = f.url || (f.signatureCipher ? "ciphered_needs_decoding" : "");
  
        return {
          itag: f.itag || 0,
          quality,
          qualityLabel,
          mimeType: f.mimeType || "",
          contentType,
          bitrate: f.bitrate || f.averageBitrate || 0,
          width: f.width,
          height: f.height,
          fps: f.fps,
          audioQuality: f.audioQuality,
          audioSampleRate: f.audioSampleRate?.toString(),
          approxDurationMs: f.approxDurationMs?.toString() || "0",
          contentLength: f.contentLength?.toString(),
          url,
          hasVideo,
          hasAudio,
        };
      };
  
      const muxed = rawMuxed.map(fallbackMapFormat).filter((f: any) => f.url && f.url !== "ciphered_needs_decoding");
      const adaptive = rawAdaptive.map(fallbackMapFormat).filter((f: any) => f.url && f.url !== "ciphered_needs_decoding");
      
      if (muxed.length > 0 || adaptive.length > 0) {
        console.log(`[video] GoogleBot fast-fetch success! Stream mapping done.`);
        const allFormats = [...muxed, ...adaptive].sort((a, b) => b.bitrate - a.bitrate);
        const videoFormats = allFormats.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
        const videoOnlyFormats = allFormats.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
        const audioOnlyFormats = allFormats.filter(f => f.hasAudio && !f.hasVideo).sort((a, b) => b.bitrate - a.bitrate);
  
        const seconds = parseInt(basic_info.lengthSeconds || "0", 10);
        const thumbnail = basic_info.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  
        return {
          videoId: basic_info.videoId || videoId,
          title: basic_info.title || "",
          description: basic_info.shortDescription || "",
          thumbnail,
          duration: formatDuration(seconds),
          durationSeconds: seconds,
          channelName: basic_info.author || "",
          channelId: basic_info.channelId || "",
          viewCount: basic_info.viewCount || "0",
          publishDate: "",
          isLive: !!basic_info.isLiveContent,
          isPrivate: false,
          formats: allFormats,
          videoFormats,
          videoOnlyFormats,
          audioOnlyFormats,
          bestVideoUrl: videoFormats[0]?.url || videoOnlyFormats[0]?.url || "",
          bestAudioUrl: audioOnlyFormats[0]?.url || "",
        };
      }
    }
  } catch (e) {
    console.warn(`[video] GoogleBot bypass failed, moving to InnerTube:`, e);
  }

  // 2. STRATEGY: Try innerTube natively with Cookies and Multiple Clients
  const yt = await getYT();
  const clientsToTry = ["TV_EMBEDDED", "IOS", "ANDROID", "WEB_CREATOR", "WEB"] as const;
  
  let info: any = null;
  let lastError = null;

  for (const client of clientsToTry) {
    try {
      console.log(`[video] Trying youtubei.js with ${client} client...`);
      const tempInfo = await yt.getInfo(videoId, { clientType: client as any });
      
      const s = tempInfo.playability_status?.status;
      if (s === "LOGIN_REQUIRED" || s === "UNPLAYABLE") {
        lastError = new Error(`Client ${client} blocked: ${s}`);
        continue;
      }
      
      const st = tempInfo.streaming_data;
      if (!st || (!st.formats?.length && !st.adaptive_formats?.length)) {
        lastError = new Error(`Client ${client} returned no streams`);
        continue;
      }
      
      info = tempInfo;
      console.log(`[video] Success with ${client} client!`);
      break; 
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  if (!info) {
    throw lastError || new Error("All extraction methods failed.");
  }

  // InnerTube success path
  const basic = info.basic_info;
  const streaming = info.streaming_data;

  const rawMuxed = streaming.formats || [];
  const rawAdaptive = streaming.adaptive_formats || [];

  const muxed = rawMuxed.map(mapFormat);
  const adaptive = rawAdaptive.map(mapFormat);

  const allFormats = [...muxed, ...adaptive].sort((a, b) => b.bitrate - a.bitrate);
  const videoFormats = allFormats
    .filter((f) => f.hasVideo && f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  const videoOnlyFormats = allFormats
    .filter((f) => f.hasVideo && !f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  const audioOnlyFormats = allFormats
    .filter((f) => f.hasAudio && !f.hasVideo)
    .sort((a, b) => b.bitrate - a.bitrate);

  const durationSeconds = basic.duration || 0;
  const thumbnail = basic.thumbnail?.[basic.thumbnail.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId: basic.id || videoId,
    title: basic.title || "",
    description: basic.short_description || "",
    thumbnail,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    channelName: basic.author || basic.channel?.name || "",
    channelId: basic.channel_id || "",
    viewCount: basic.view_count?.toString() || "0",
    publishDate: "",
    isLive: !!basic.is_live,
    isPrivate: false,
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
      return NextResponse.json({ error: "Invalid YouTube video ID" }, { status: 400 });
    }

    console.log(`[youtube/video] Extractor processing: ${videoId}`);
    const info = await fetchVideoInfo(videoId);
    console.log(`[youtube/video] OK: ${info.formats.length} target formats.`);
    
    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error("[youtube/video] ERROR:", error);
    return NextResponse.json(
      {
        error: "Video info extraction failed or blocked.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
