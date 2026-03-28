import { NextRequest, NextResponse } from "next/server";

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
  if (isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── UNIQUE NATIVE VERCEL EDGE BYPASS SCRAPER (Completley Custom) ─────────
// This uses Vercel's Cloudflare Proxy Edge runtime specifically to avoid AWS blocks.
// No youtubei.js dependencies = No VM2 crashes on Edge!

async function fetchAdvancedEdgeScrape(videoId: string): Promise<any> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const headersList = [
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      "Accept-Language": "en-US,en;q=0.9",
    },
    {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept-Language": "en-US,en;q=0.9",
    }
  ];

  let rawHtml = "";
  let successHeaders = null;

  for (const headers of headersList) {
    try {
      const resp = await fetch(ytUrl, { headers });
      if (resp.ok) {
        rawHtml = await resp.text();
        successHeaders = headers;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!rawHtml) throw new Error("Failed to fetch YouTube HTML via Edge Cloudflare Proxy.");

  // Regex extract ytInitialPlayerResponse
  const match = rawHtml.match(/var ytInitialPlayerResponse\s*=\s*({[\s\S]+?});var/) 
             || rawHtml.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]+?});<\/script>/)
             || rawHtml.match(/\["ytInitialPlayerResponse"\]\s*=\s*({[\s\S]+?});/);

  if (!match) {
    // Attempt dynamic backend fetch fallback (Cobalt fallback style via alternative open relay if pure HTML fails)
    // Here we strictly use our own extraction. If it completely fails, IP might be globally blocked.
    throw new Error("Embedded ytInitialPlayerResponse not found.");
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    throw new Error("Failed to parse ytInitialPlayerResponse JSON.");
  }

  if (data.playabilityStatus?.status === "LOGIN_REQUIRED" || data.playabilityStatus?.status === "UNPLAYABLE") {
    // If strict IP block kicks in, we can execute a secondary internal fetch to an alternative domain 
    // hosted by Youtube like the Web Creator Studio endpoint or gaming.youtube.com
    
    // Quick internal workaround: fetch from music.youtube.com explicitly
    const altResp = await fetch(`https://music.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": successHeaders?.["User-Agent"] || "" },
        body: JSON.stringify({
            context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20231214.00.00", hl: "en" } },
            videoId: videoId
        })
    });
    
    if (altResp.ok) {
        const altData = await altResp.json();
        if (altData.streamingData) return altData;
    }

    throw new Error(`Video Blocked by Datacenter Firewall: ${data.playabilityStatus.status}`);
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

    console.log(`[youtube/video] NATIVE EDGE EXTRACTOR processing: ${videoId}`);
    
    // 🔥 Execute our unique custom Edge proxy native fallback
    let ytData: any = null;
    let usePipedFallback = false;
    
    try {
      ytData = await fetchAdvancedEdgeScrape(videoId);
      if (!ytData || !ytData.streamingData) {
        usePipedFallback = true;
      }
    } catch (e) {
      console.warn(`[youtube/video] Native scrape blocked (${(e as Error).message}). Jumping to Secure API...`);
      usePipedFallback = true;
    }

    let allFormats: StreamFormat[] = [];
    let videoFormats: StreamFormat[] = [];
    let videoOnlyFormats: StreamFormat[] = [];
    let audioOnlyFormats: StreamFormat[] = [];
    let videoDetails: any = ytData?.videoDetails || { videoId, title: "YouTube Video", shortDescription: "", lengthSeconds: "0", viewCount: "0" };

    if (!usePipedFallback) {
      const rawMuxed = ytData.streamingData.formats || [];
      const rawAdaptive = ytData.streamingData.adaptiveFormats || [];

      const mapToOurFormat = (f: any): StreamFormat => {
        const { isVideo, isAudio } = parseMime(f.mimeType || "");
        const hasVideo = isVideo || !!f.width;
        const hasAudio = isAudio || !!f.audioQuality;

        let contentType: "video" | "audio" | "video+audio" = "video+audio";
        if (hasVideo && !hasAudio) contentType = "video";
        else if (hasAudio && !hasVideo) contentType = "audio";

        let qualityLabel = f.qualityLabel || (f.audioQuality ? f.audioQuality.replace("AUDIO_QUALITY_", "").toLowerCase() : "");
        let quality = qualityLabel || f.quality || "unknown";

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
        usePipedFallback = true;
      } else {
        const allSorted = [...muxed, ...adaptive].sort((a, b) => b.bitrate - a.bitrate);
        videoFormats = allSorted.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
        videoOnlyFormats = allSorted.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
        audioOnlyFormats = allSorted.filter(f => f.hasAudio && !f.hasVideo).sort((a, b) => b.bitrate - a.bitrate);
        allFormats = allSorted;
      }
    }

    if (usePipedFallback) {
      console.log(`[youtube/video] Bypassing Vercel Block via Secure Open Relay...`);
      const relayResp = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
      if (!relayResp.ok) throw new Error("Video is fully DRM encrypted and Vercel/Open Relays are busy.");
      const relayData = await relayResp.json();
      
      const pipemap = (f: any, t: "video" | "audio" | "videoOnly") => ({
        itag: f.itag || 0,
        quality: f.quality || f.height?.toString() || "unknown",
        qualityLabel: f.quality || "",
        mimeType: f.mimeType || "",
        contentType: t === "videoOnly" ? "video" : t,
        bitrate: f.bitrate || 0,
        width: f.width,
        height: f.height,
        fps: f.fps,
        url: f.url,
        hasVideo: t === "video" || t === "videoOnly",
        hasAudio: t === "audio" || t === "video",
        approxDurationMs: "0",
      } as StreamFormat);

      audioOnlyFormats = (relayData.audioStreams || []).map((x: any) => pipemap(x, "audio"));
      videoFormats = (relayData.videoStreams || []).filter((x:any)=>!x.videoOnly).map((x: any) => pipemap(x, "video"));
      videoOnlyFormats = (relayData.videoStreams || []).filter((x:any)=>x.videoOnly).map((x: any) => pipemap(x, "videoOnly"));
      
      allFormats = [...audioOnlyFormats, ...videoFormats, ...videoOnlyFormats].sort((a, b) => b.bitrate - a.bitrate);
    }

    const seconds = videoDetails?.lengthSeconds ? parseInt(videoDetails.lengthSeconds, 10) : 0;
    const thumbnail = videoDetails?.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return NextResponse.json({
      success: true,
      data: {
        videoId: videoDetails?.videoId || videoId,
        title: videoDetails?.title || "Video",
        description: videoDetails?.shortDescription || "",
        thumbnail,
        duration: formatDuration(seconds),
        durationSeconds: seconds,
        channelName: videoDetails?.author || "",
        channelId: videoDetails?.channelId || "",
        viewCount: videoDetails?.viewCount || "0",
        publishDate: "",
        isLive: !!videoDetails?.isLiveContent,
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
    console.error("[youtube/video] EDGE EXTRACTOR ERROR:", error);
    return NextResponse.json(
      {
        error: "Native Edge Extraction failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
