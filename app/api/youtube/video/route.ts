import { NextRequest, NextResponse } from "next/server";
import { Innertube, UniversalCache } from "youtubei.js";

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
  const hasVideo = f.has_video;
  const hasAudio = f.has_audio;

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

  // Descramble URL correctly
  let url = f.url || "";
  if (!url && f.decipher) {
    url = f.decipher(); // youtubei.js natively provides URL deciphering!
  }

  return {
    itag: f.itag,
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
    ytInstance = await Innertube.create({
      generate_session_locally: true,
      cache: new UniversalCache(false),
    });
  }
  return ytInstance;
}

async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  const yt = await getYT();
  
  // getInfo correctly builds poToken bypassing botguard!
  const info = await yt.getInfo(videoId);

  const basic = info.basic_info;
  const streaming = info.streaming_data;

  if (info.playability_status?.status === "LOGIN_REQUIRED") {
    throw new Error("LOGIN_REQUIRED: YouTube restricted this video.");
  }
  if (!streaming || (!streaming.formats?.length && !streaming.adaptive_formats?.length)) {
    throw new Error("No streams returned by YouTube API (Botguard block or no formats available).");
  }

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

    console.log(`[youtube/video] Fetching via youtubei.js: ${videoId}`);
    const info = await fetchVideoInfo(videoId);
    console.log(`[youtube/video] OK: ${info.formats.length} target formats.`);
    
    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error("[youtube/video] ERROR:", error);
    return NextResponse.json(
      {
        error: "Video info extraction failed or blocked",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
