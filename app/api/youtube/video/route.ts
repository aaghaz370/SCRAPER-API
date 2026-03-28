import { NextRequest, NextResponse } from "next/server";
import * as ytdl from "@distube/ytdl-core";
import { YOUTUBE_COOKIES } from "../cookies";

export const dynamic = "force-dynamic";
export const preferredRegion = "lhr1"; // London - avoids AWS US-East YouTube IP blocks

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
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildCookieHeader(): string {
  const envCookie = process.env.YOUTUBE_COOKIE;
  if (envCookie) return envCookie;
  if (YOUTUBE_COOKIES) return YOUTUBE_COOKIES;
  return "";
}

function mapYtdlFormat(f: ytdl.videoFormat): StreamFormat {
  const hasVideo = !!f.hasVideo;
  const hasAudio = !!f.hasAudio;

  let contentType: "video" | "audio" | "video+audio" = "video+audio";
  if (hasVideo && !hasAudio) contentType = "video";
  else if (hasAudio && !hasVideo) contentType = "audio";

  const qualityLabel = f.qualityLabel || (f.audioQuality ? f.audioQuality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
  const quality = qualityLabel || f.quality || "unknown";

  return {
    itag: f.itag,
    quality,
    qualityLabel,
    mimeType: f.mimeType || "",
    contentType,
    bitrate: f.bitrate || f.averageBitrate || 0,
    width: f.width,
    height: f.height,
    fps: f.fps,
    audioQuality: f.audioQuality,
    audioSampleRate: f.audioSampleRate,
    approxDurationMs: f.approxDurationMs || "0",
    contentLength: f.contentLength,
    url: f.url || "",
    hasVideo,
    hasAudio,
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

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[youtube/video] Extracting via @distube/ytdl-core: ${videoId}`);

    // Build agent with cookies injected for authentication
    const cookieStr = buildCookieHeader();
    const agent = cookieStr
      ? ytdl.createAgent(
          cookieStr.split(";").map((pair) => {
            const [name, ...rest] = pair.trim().split("=");
            return { name: name.trim(), value: rest.join("=").trim(), domain: ".youtube.com", path: "/" };
          })
        )
      : undefined;

    const info = await ytdl.getInfo(videoUrl, {
      agent,
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          ...(cookieStr ? { Cookie: cookieStr } : {}),
        },
      },
    });

    const details = info.videoDetails;
    const rawFormats = info.formats.filter((f) => f.url); // only usable formats

    if (rawFormats.length === 0) {
      throw new Error("No usable stream URLs extracted. Video may be DRM-protected or restricted.");
    }

    const allFormats = rawFormats.map(mapYtdlFormat).sort((a, b) => b.bitrate - a.bitrate);

    const videoFormats = allFormats
      .filter((f) => f.hasVideo && f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    const videoOnlyFormats = allFormats
      .filter((f) => f.hasVideo && !f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    const audioOnlyFormats = allFormats
      .filter((f) => f.hasAudio && !f.hasVideo)
      .sort((a, b) => b.bitrate - a.bitrate);

    const durationSeconds = parseInt(details.lengthSeconds || "0", 10);
    const thumbnail =
      details.thumbnails?.[details.thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return NextResponse.json({
      success: true,
      data: {
        videoId: details.videoId || videoId,
        title: details.title || "Video",
        description: details.description || "",
        thumbnail,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        channelName: details.author?.name || details.ownerChannelName || "",
        channelId: details.channelId || "",
        viewCount: details.viewCount || "0",
        publishDate: details.publishDate || details.uploadDate || "",
        isLive: !!details.isLiveContent,
        isPrivate: !!details.isPrivate,
        formats: allFormats,
        videoFormats,
        videoOnlyFormats,
        audioOnlyFormats,
        bestVideoUrl: videoFormats[0]?.url || videoOnlyFormats[0]?.url || "",
        bestAudioUrl: audioOnlyFormats[0]?.url || "",
      },
    });
  } catch (error) {
    console.error("[youtube/video] ERROR:", error);
    return NextResponse.json(
      {
        error: "Extraction failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
