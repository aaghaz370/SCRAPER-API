import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

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
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapFormat(f: ytdl.videoFormat): StreamFormat {
  const mimeType = f.mimeType || "";
  const hasVideo = f.hasVideo ?? mimeType.startsWith("video/");
  const hasAudio = f.hasAudio ?? mimeType.startsWith("audio/");

  let contentType: "video" | "audio" | "video+audio" = "video+audio";
  if (hasVideo && !hasAudio) contentType = "video";
  else if (hasAudio && !hasVideo) contentType = "audio";

  const qualityLabel = f.qualityLabel || "";
  const audioQuality = (f.audioQuality || "").replace("AUDIO_QUALITY_", "").toLowerCase();

  let quality = qualityLabel;
  if (!quality) {
    if (!hasVideo && hasAudio)
      quality = `${Math.round((f.bitrate || 0) / 1000)}kbps audio`;
    else quality = f.quality || "unknown";
  }

  return {
    itag: f.itag,
    quality,
    qualityLabel,
    mimeType,
    contentType,
    bitrate: f.bitrate || f.averageBitrate || 0,
    width: f.width,
    height: f.height,
    fps: f.fps,
    audioQuality: audioQuality || undefined,
    audioSampleRate: f.audioSampleRate,
    approxDurationMs: f.approxDurationMs || "0",
    contentLength: f.contentLength,
    url: f.url,
    hasVideo,
    hasAudio,
  };
}

async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  // createAgent() sets up a cookie jar + undici HTTP/2 dispatcher
  // It internally uses IOS + ANDROID clients via youtubei.googleapis.com
  // which bypass Vercel's datacenter IP detection
  const agent = ytdl.createAgent([
    { name: "CONSENT", value: "YES+1", domain: ".youtube.com", path: "/" },
    { name: "SOCS", value: "CAESEwgDEgk0OTcxMzI3NTIaAmVuIAEaBgiAlLKxBg==", domain: ".youtube.com", path: "/" },
  ]);

  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
    agent,
    // Use IOS + ANDROID clients (most reliable on datacenter IPs)
    playerClients: ["IOS", "ANDROID"] as any,
  });

  const vd = info.videoDetails;
  const allRaw = info.formats;

  const allFormats = allRaw.map(mapFormat).sort((a, b) => b.bitrate - a.bitrate);

  const videoFormats = allFormats
    .filter((f) => f.hasVideo && f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  const videoOnlyFormats = allFormats
    .filter((f) => f.hasVideo && !f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  const audioOnlyFormats = allFormats
    .filter((f) => f.hasAudio && !f.hasVideo)
    .sort((a, b) => b.bitrate - a.bitrate);

  const durationSeconds = parseInt(vd.lengthSeconds || "0");
  const thumbnails = vd.thumbnails || [];
  const thumbnail =
    thumbnails[thumbnails.length - 1]?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId: vd.videoId,
    title: vd.title,
    description: (vd as any).description || "",
    thumbnail,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    channelName: vd.author?.name || "",
    channelId:
      vd.author?.channel_url?.split("/channel/")?.[1] ||
      vd.author?.id ||
      "",
    viewCount: vd.viewCount || "0",
    publishDate: (vd as any).publishDate || (vd as any).uploadDate || "",
    isLive: !!vd.isLiveContent,
    isPrivate: !!(vd as any).isPrivate,
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

    console.log(`[youtube/video] Fetching: ${videoId}`);
    const info = await fetchVideoInfo(videoId);
    console.log(
      `[youtube/video] OK: ${info.formats.length} formats, ${info.videoOnlyFormats.length} video-only, ${info.audioOnlyFormats.length} audio-only`
    );
    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error("[youtube/video] ERROR:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        error: "Video info extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
