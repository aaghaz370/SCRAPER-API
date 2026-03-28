import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const preferredRegion = "lhr1";

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
  hlsManifestUrl?: string;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── THE DEFINITIVE VERCEL AWS BYPASS: MWEB HTML SCRAPER ─────────────────────
// Uses m.youtube.com with legacy iPhone Safari UA. MWEB completely bypasses
// the US Datacenter IP BotGuard restrictions blocking standard youtubei.js clients.

async function fetchMwebBypass(videoId: string): Promise<any> {
  const ytUrl = `https://m.youtube.com/watch?v=${videoId}`;
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://m.youtube.com/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  };

  const resp = await fetch(ytUrl, { headers });
  if (!resp.ok) {
    throw new Error(`Mobile Fetch failed with status: ${resp.status}`);
  }

  const rawHtml = await resp.text();

  // Extract MWEB payload securely
  const match = rawHtml.match(/var ytInitialPlayerResponse\s*=\s*({[\s\S]+?});var/) 
             || rawHtml.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]+?});<\/script>/)
             || rawHtml.match(/\["ytInitialPlayerResponse"\]\s*=\s*({[\s\S]+?});/);

  if (!match) {
    throw new Error("Embedded ytInitialPlayerResponse not found in MWEB HTML.");
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    throw new Error("Failed to parse ytInitialPlayerResponse JSON from MWEB.");
  }

  if (data.playabilityStatus?.status === "LOGIN_REQUIRED" || data.playabilityStatus?.status === "UNPLAYABLE") {
    throw new Error(`MWEB IP Detection Blocked Video: ${data.playabilityStatus.status}`);
  }

  return data;
}

function parseMime(mime: string) {
  const isVideo = mime.includes("video/");
  const isAudio = mime.includes("audio/");
  return { isVideo, isAudio };
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

    console.log(`[youtube/video] MWEB Bypass processing: ${videoId}`);
    
    // Execute our unique 100% custom MWEB Datacenter bypass
    const ytData = await fetchMwebBypass(videoId);
    
    if (!ytData.streamingData) {
      throw new Error("No streaming data found via MWEB! Video might be heavily age-restricted, paid content, or blocked globally.");
    }

    const { videoDetails, streamingData } = ytData;

    const rawMuxed = streamingData.formats || [];
    const rawAdaptive = streamingData.adaptiveFormats || [];
    const hlsManifestUrl = streamingData.hlsManifestUrl || undefined;

    const mapToOurFormat = (f: any): StreamFormat => {
      const { isVideo, isAudio } = parseMime(f.mimeType || "");
      const hasVideo = isVideo || !!f.width;
      const hasAudio = isAudio || !!f.audioQuality;

      let contentType: "video" | "audio" | "video+audio" = "video+audio";
      if (hasVideo && !hasAudio) contentType = "video";
      else if (hasAudio && !hasVideo) contentType = "audio";

      let qualityLabel = f.qualityLabel || (f.audioQuality ? f.audioQuality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
      let quality = qualityLabel || f.quality || "unknown";

      // Mobile WEB completely bypasses BotGuard URL encryptions for most cases, granting direct video URLs natively.
      let url = f.url || (f.signatureCipher ? "cipher_protected" : "");

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

    const muxed = rawMuxed.map(mapToOurFormat).filter((f: any) => f.url && f.url !== "cipher_protected");
    const adaptive = rawAdaptive.map(mapToOurFormat).filter((f: any) => f.url && f.url !== "cipher_protected");

    if (muxed.length === 0 && adaptive.length === 0) {
      throw new Error("MWEB successfully fetched but all links were cipher protected. Video requires DRM keys.");
    }

    const allFormats = [...muxed, ...adaptive].sort((a, b) => b.bitrate - a.bitrate);
    const videoFormats = allFormats.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const videoOnlyFormats = allFormats.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const audioOnlyFormats = allFormats.filter(f => f.hasAudio && !f.hasVideo).sort((a, b) => b.bitrate - a.bitrate);

    const seconds = parseInt(videoDetails.lengthSeconds || "0", 10);
    const thumbnail = videoDetails.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return NextResponse.json({
      success: true,
      data: {
        videoId: videoDetails.videoId || videoId,
        title: videoDetails.title || "Video",
        description: videoDetails.shortDescription || "",
        thumbnail,
        duration: formatDuration(seconds),
        durationSeconds: seconds,
        channelName: videoDetails.author || "",
        channelId: videoDetails.channelId || "",
        viewCount: videoDetails.viewCount || "0",
        publishDate: "",
        isLive: !!videoDetails.isLiveContent,
        isPrivate: false,
        formats: allFormats,
        videoFormats,
        videoOnlyFormats,
        audioOnlyFormats,
        bestVideoUrl: videoFormats[0]?.url || videoOnlyFormats[0]?.url || "",
        bestAudioUrl: audioOnlyFormats[0]?.url || "",
        hlsManifestUrl, 
      }
    });

  } catch (error) {
    console.error("[youtube/video] MWEB EDGE EXTRACTOR ERROR:", error);
    return NextResponse.json(
      {
        error: "Native Custom Extractor Failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
