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

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const hasVideo = f.hasVideo;
  const hasAudio = f.hasAudio;

  let contentType: "video" | "audio" | "video+audio" = "video+audio";
  if (hasVideo && !hasAudio) contentType = "video";
  else if (hasAudio && !hasVideo) contentType = "audio";

  const qualityLabel = f.qualityLabel || "";
  const audioQualityRaw = f.audioQuality || "";
  const audioQuality = audioQualityRaw.replace("AUDIO_QUALITY_", "").toLowerCase();

  let quality = qualityLabel;
  if (!quality) {
    if (!hasVideo && hasAudio) quality = `${Math.round((f.bitrate || 0) / 1000)}kbps audio`;
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
  const agent = ytdl.createAgent();

  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
    agent,
    requestOptions: {
      headers: {
        "User-Agent": DESKTOP_UA,
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
  });

  const vd = info.videoDetails;
  const allRaw = info.formats;

  const allFormats = allRaw.map(mapFormat).sort((a, b) => b.bitrate - a.bitrate);

  // video+audio (muxed) - sorted highest res first
  const videoFormats = allFormats
    .filter((f) => f.hasVideo && f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  // video only (DASH) - sorted highest res first
  const videoOnlyFormats = allFormats
    .filter((f) => f.hasVideo && !f.hasAudio)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  // audio only - sorted highest bitrate first
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
    description: vd.description || "",
    thumbnail,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    channelName: vd.author?.name || "",
    channelId: vd.author?.channel_url?.split("/channel/")[1] || "",
    viewCount: vd.viewCount || "0",
    publishDate: vd.publishDate || vd.uploadDate || "",
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
