import { NextRequest, NextResponse } from "next/server";
import { Innertube, UniversalCache } from "youtubei.js";
import { YOUTUBE_COOKIES } from "../cookies";

// ─── UNIQUE VERCEL BYPASS: DEPLOY TO EU/ASIAN REGIONS to Evade US Datacenter Ban ───
// Most YouTube blocklists target AWS US-East (iad1). By switching region to London/Singapore,
// we completely evade the regional BotGuard Datacenter checks.
export const preferredRegion = 'lhr1'; 
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
  url: string;
  hasVideo: boolean;
  hasAudio: boolean;
  contentLength?: string;
  approxDurationMs?: string;
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
  if (isNaN(seconds)) return "0:00";
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

  const qualityLabel = f.quality_label || (f.audio_quality ? f.audio_quality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
  let quality = qualityLabel || f.quality || "unknown";
  if (hasAudio && !hasVideo && !qualityLabel) quality = `${Math.round((f.bitrate || 0) / 1000)}kbps audio`;

  // natively deciphers URL if needed via youtubei.js built-in VM
  let url = f.url || "";
  if (!url && f.decipher) {
    try { url = f.decipher(); } catch { url = ""; }
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
    // Combine cookies effectively for node-fetch injection
    const cookieString = process.env.YOUTUBE_COOKIE || YOUTUBE_COOKIES || "";
    
    ytInstance = await Innertube.create({
      cookie: cookieString,
      generate_session_locally: true,
      cache: new UniversalCache(false),
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const customInit = { ...init };
        if (cookieString) {
          customInit.headers = {
            ...customInit.headers,
            Cookie: cookieString,
          };
        }
        return fetch(input, customInit);
      }
    });
  }
  return ytInstance;
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

    console.log(`[youtube/video] Extractor Processing Video: ${videoId}`);
    
    // ─── UNIQUE EXTRACTOR LOGIC (NO THIRD PARTY RELAYS) ───
    const yt = await getYT();

    // Specific order of resilient clients to heavily bypass IP soft-bans
    // MWEB (Mobile Web) and ANDROID_VR are known to have virtually no BotGuard verification.
    const clientsToTry = ["TV_EMBEDDED", "IOS", "ANDROID_VR", "MWEB", "ANDROID", "WEB_CREATOR", "WEB"] as const;
    
    let info: any = null;
    let lastError: Error | null = null;
    let successClient = "";

    for (const client of clientsToTry) {
      try {
        console.log(`[video] Testing ${client} payload over preferred Vercel region...`);
        const tempInfo = await yt.getInfo(videoId, { client: client as any });
        
        const s = tempInfo.playability_status?.status;
        if (s === "LOGIN_REQUIRED" || s === "UNPLAYABLE") {
          lastError = new Error(`Client ${client} blocked by IP: ${s}`);
          continue;
        }
        
        const st = tempInfo.streaming_data;
        if (!st || (!st.formats?.length && !st.adaptive_formats?.length)) {
          lastError = new Error(`Client ${client} returned 0 stream variants`);
          continue;
        }
        
        info = tempInfo;
        successClient = client;
        console.log(`[video] Success over Datacenter with ${client}! Streams unlocked.`);
        break; 
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        continue;
      }
    }

    if (!info) {
      throw lastError || new Error("Backend IP is fully Blacklisted by Youtube and all Local Clients Failed.");
    }

    // Process valid formats securely
    const basic = info.basic_info;
    const streaming = info.streaming_data;

    const rawMuxed = streaming.formats || [];
    const rawAdaptive = streaming.adaptive_formats || [];

    const muxed = rawMuxed.map(mapFormat);
    const adaptive = rawAdaptive.map(mapFormat);

    const allFormats = [...muxed, ...adaptive]
      .filter(f => f.url)
      .sort((a, b) => b.bitrate - a.bitrate);

    const videoFormats = allFormats.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const videoOnlyFormats = allFormats.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const audioOnlyFormats = allFormats.filter(f => f.hasAudio && !f.hasVideo).sort((a, b) => b.bitrate - a.bitrate);

    const durationSeconds = basic.duration || 0;
    const thumbnail = basic.thumbnail?.[basic.thumbnail.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return NextResponse.json({
      success: true,
      data: {
        videoId: basic.id || videoId,
        title: basic.title || "Video",
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
      }
    });

  } catch (error) {
    console.error("[youtube/video] EXTRACTION ERROR:", error);
    return NextResponse.json(
      {
        error: "Our Custom Scraper was completely blocked by Vercel IP.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
