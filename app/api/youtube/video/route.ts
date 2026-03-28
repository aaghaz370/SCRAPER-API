import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, copyFile, chmod, access } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro allows up to 60s

// ─── Netscape cookies bundled directly ───────────────────────────────────────
// Updated by replacing these contents or setting YOUTUBE_COOKIE_FILE env var
const COOKIE_FILE_CONTENT = process.env.YOUTUBE_COOKIES_NETSCAPE || `# Netscape HTTP Cookie File
.youtube.com	TRUE	/	FALSE	1778585611	_ga	GA1.1.1501577195.1744025611
.youtube.com	TRUE	/	FALSE	1778585651	_ga_VCGEPY40VB	GS1.1.1744025610.1.1.1744025650.20.0.0
.youtube.com	TRUE	/	TRUE	1809272796	PREF	tz=Asia.Calcutta&f4=4000000&f7=100&repeat=NONE&autoplay=true&f6=40000000
.youtube.com	TRUE	/	FALSE	1777453374	_gcl_au	1.1.1028906972.1769677374
.youtube.com	TRUE	/	TRUE	1774714570	GPS	1
.youtube.com	TRUE	/	TRUE	1809272777	__Secure-3PAPISID	22x64DXwsAI4oVky/AK6vvwpPHWw4jAf4P
.youtube.com	TRUE	/	TRUE	1774712894	YTSESSION-98epo9	ANPz9KjsNPpKPlYnCXQVhmp5bukEbObJdq3mQL2lyfjyIUfba9D5wQ28RSYr/Hxx+GQnhlOyO/0vmgbVx0MJyJ5EaF6GwHbLhTMeuMQ=
.youtube.com	TRUE	/	TRUE	1806248776	__Secure-1PSIDTS	sidts-CjQBWhotCdyTs6gmCbgOfvKekLzkM1Qby3EzfyYqB6_fKyUaqOUQgdBeBM3nHqVRfDn144B4EAA
.youtube.com	TRUE	/	TRUE	1806248776	__Secure-3PSIDTS	sidts-CjQBWhotCdyTs6gmCbgOfvKekLzkM1Qby3EzfyYqB6_fKyUaqOUQgdBeBM3nHqVRfDn144B4EAA
.youtube.com	TRUE	/	FALSE	1809272777	HSID	A3BjWec3D3WjFScyy
.youtube.com	TRUE	/	TRUE	1809272777	SSID	AeqAxKrBM65-Jl5m1
.youtube.com	TRUE	/	FALSE	1809272777	APISID	HBnGgdmHLTLitgVg/AyKSQ2MJbzqarTsin
.youtube.com	TRUE	/	TRUE	1809272777	SAPISID	22x64DXwsAI4oVky/AK6vvwpPHWw4jAf4P
.youtube.com	TRUE	/	TRUE	1809272777	__Secure-1PAPISID	22x64DXwsAI4oVky/AK6vvwpPHWw4jAf4P
.youtube.com	TRUE	/	FALSE	1809272777	SID	g.a0008QjLh4U_eGBQfGtuy193w0vD-szhGWuW7ost1G82kHjb4TJ5BXjB4VHyb2pZ3JSQ5kpOJwACgYKASkSARUSFQHGX2Mi0eMRO6qv2e7wvsODfXJ6RhoVAUF8yKqr5KzuJ_77YBN05Rahcq-z0076
.youtube.com	TRUE	/	TRUE	1809272777	__Secure-1PSID	g.a0008QjLh4U_eGBQfGtuy193w0vD-szhGWuW7ost1G82kHjb4TJ5aVIE3yRkWwGQMnpQRNfW2wACgYKAagSARUSFQHGX2Mi3znyJ0VhEQkORl30-MQwYBoVAUF8yKrw2VVq-0GLkUofeGqxb2530076
.youtube.com	TRUE	/	TRUE	1809272777	__Secure-3PSID	g.a0008QjLh4U_eGBQfGtuy193w0vD-szhGWuW7ost1G82kHjb4TJ5opW4SCgSsKLkJc85NFw4fgACgYKAcgSARUSFQHGX2Mi96OQjN86K1M6tK9lhTZ0DBoVAUF8yKqLurSQ0XCGEHOGHtQsFEgW0076
.youtube.com	TRUE	/	TRUE	1809272777	LOGIN_INFO	AFmmF2swRgIhAOSBx86Gr9U_hlb3Bze2TaHOeJ0DQiosP0kZhderKKfFAiEA8SouTfkttI5ahoLnlyy15dzDAbR2-uFkRrzhz1joE1U:QUQ3MjNmeFFFWmdfcXNfcE1qR2pUc19tSkJEYlNBc0lwN2ZDTUtYVzFPRExDMGI4VzNlMGQxWHlzSnBsbEdvb3h6VXlSa0swMnJMSEZucWlBWkFLWTMzTlN0a0pjbE5xVnNiMFlIU3Z3a0pPR29vMy1mLWJEUkJTeHJzS1A5NGNYdWczUkZSNTdJTktiVFAxTm1nbTY2VlJ2LXFfMUVFT1Zn
.youtube.com	TRUE	/	TRUE	1774712897	YTSESSION-1b	ANPz9KjrgdGr7G8+uyD+wf2W38KRgH/MVfOnzbjWmcOQew9oFcdsmd4xyrD2rytafHiY3nhRqvnsf7nr6WNEOf9tmcQnXbPy/VoSb8w=
.youtube.com	TRUE	/	FALSE	1806248798	SIDCC	AKEyXzWJC1KHDUcYB9mFBMNYmKOAC4CQqvDh8fTxH2sz7nICFzHCSlzYDgAnaDMYWofntlD6
.youtube.com	TRUE	/	TRUE	1806248798	__Secure-1PSIDCC	AKEyXzVjAUkdGhqcmysfI5clkB5Nq3-Veg4j1zKCKY6RCYFxoLtZdqTHOZjbnkIJonA03eku_Q
.youtube.com	TRUE	/	TRUE	1806248798	__Secure-3PSIDCC	AKEyXzUXkzsD0nETQ6GIY7WPTT3xV0oc_fktMtSJDhsVVc3bqvVrK9FKvQp4ASYXeleshzpZVYP-
.youtube.com	TRUE	/	TRUE	1790264778	VISITOR_INFO1_LIVE	O0OwIuJG5AQ
.youtube.com	TRUE	/	TRUE	1790264778	VISITOR_PRIVACY_METADATA	CgJJThIEGgAgYw%3D%3D
.youtube.com	TRUE	/	TRUE	0	YSC	ab3W8R58Ji4
.youtube.com	TRUE	/	TRUE	1790264770	__Secure-ROLLOUT_TOKEN	CNaYkPbbkveB1QEQ1oz83a_1igMYtPqbovjCkwM%3D
`;

// Path to the bundled yt-dlp Linux binary (included in repo under bin/)
function getBinarySourcePath(): string {
  // In Vercel the CWD is /var/task which contains the project files
  const candidates = [
    path.join(process.cwd(), "bin", "yt-dlp"),
    path.join(__dirname, "..", "..", "..", "..", "bin", "yt-dlp"),
    "/var/task/bin/yt-dlp",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error("yt-dlp binary not found in bundle. Make sure bin/yt-dlp is committed.");
}

// Setup: Copy binary to /tmp (writable) and chmod +x it once per container
let binaryReady = false;
const TMP_BINARY = "/tmp/yt-dlp-bin";
const TMP_COOKIES = "/tmp/yt-cookies.txt";

async function ensureReady() {
  if (!binaryReady) {
    const src = getBinarySourcePath();
    await copyFile(src, TMP_BINARY);
    await chmod(TMP_BINARY, 0o755);
    await writeFile(TMP_COOKIES, COOKIE_FILE_CONTENT, "utf8");
    binaryReady = true;
  }
  // Always refresh cookies file in case env changed
  await writeFile(TMP_COOKIES, COOKIE_FILE_CONTENT, "utf8");
}

// Run yt-dlp --dump-json for a video URL
function runYtDlp(videoUrl: string, debug = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [
      "--dump-single-json",
      "--no-warnings",
      "--no-playlist",
      "--no-check-formats",
      // Use ios only — no web client (web forces SABR which needs po_token)
      "--extractor-args", "youtube:player_client=ios",
      "--cookies", TMP_COOKIES,
      "--add-header", "Accept-Language:en-US,en;q=0.9",
      ...(debug ? ["--verbose"] : []),
      videoUrl,
    ];

    // CRITICAL FIX:
    // yt-dlp needs "node" in PATH to generate PO Tokens via JS Challenge.
    // When running as a child process on Vercel Lambda, PATH may not include
    // the directory where Node.js lives. We expose it explicitly.
    const nodeDir = path.dirname(process.execPath);
    const childEnv = {
      ...process.env,
      PATH: `${nodeDir}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
      HOME: "/tmp", // yt-dlp needs a writable HOME
      TMPDIR: "/tmp",
    };

    execFile(TMP_BINARY, args, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 55000,
      env: childEnv,
    }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr || err.message || "yt-dlp unknown error"));
      }
      try {
        resolve({ data: JSON.parse(stdout), stderr });
      } catch (e) {
        reject(new Error(`yt-dlp JSON parse failed. stdout[0:200]=${stdout.substring(0, 200)}`));
      }
    });
  });
}

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
  approxDurationMs: string;
  contentLength?: string;
  url: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapYtDlpFormat(f: any): StreamFormat | null {
  if (!f.url) return null;
  const mimeType = f.ext ? (f.vcodec !== "none" && f.acodec !== "none" ? `video/${f.ext}` : f.vcodec !== "none" ? `video/${f.ext}` : `audio/${f.ext}`) : "";
  const hasVideo = f.vcodec && f.vcodec !== "none";
  const hasAudio = f.acodec && f.acodec !== "none";

  let contentType: "video" | "audio" | "video+audio" = "video+audio";
  if (hasVideo && !hasAudio) contentType = "video";
  else if (hasAudio && !hasVideo) contentType = "audio";

  const qualityLabel = f.format_note || f.quality_label || (f.height ? `${f.height}p` : "");
  const quality = qualityLabel || f.format_id || "unknown";

  return {
    itag: parseInt(f.format_id) || 0,
    quality,
    qualityLabel,
    mimeType: f.ext ? `video/${f.ext}` : mimeType,
    contentType,
    bitrate: f.tbr ? Math.round(f.tbr * 1000) : (f.abr ? Math.round(f.abr * 1000) : f.vbr ? Math.round(f.vbr * 1000) : 0),
    width: f.width || undefined,
    height: f.height || undefined,
    fps: f.fps || undefined,
    audioQuality: f.audio_ext || undefined,
    approxDurationMs: f.duration ? String(Math.round(f.duration * 1000)) : "0",
    contentLength: f.filesize ? String(f.filesize) : undefined,
    url: f.url,
    hasVideo: !!hasVideo,
    hasAudio: !!hasAudio,
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

    await ensureReady();

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[youtube/video] yt-dlp extracting: ${videoId}`);

    const debug = searchParams.get("debug") === "1";
    const { data, stderr: ytStderr } = await runYtDlp(videoUrl, debug);

    const rawFormats: any[] = data.formats || [];
    const allFormats = rawFormats
      .map(mapYtDlpFormat)
      .filter((f): f is StreamFormat => f !== null && !!f.url)
      .sort((a, b) => b.bitrate - a.bitrate);

    if (allFormats.length === 0) {
      return NextResponse.json({
        error: "No playable stream URLs found.",
        formatsReceived: rawFormats.length,
        ytDebug: ytStderr?.split("\n").slice(-20).join("\n"),
      }, { status: 500 });
    }

    const videoFormats = allFormats
      .filter(f => f.hasVideo && f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const videoOnlyFormats = allFormats
      .filter(f => f.hasVideo && !f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const audioOnlyFormats = allFormats
      .filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => b.bitrate - a.bitrate);

    const durationSeconds = data.duration || 0;
    const thumbnail =
      data.thumbnail ||
      data.thumbnails?.[data.thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return NextResponse.json({
      success: true,
      data: {
        videoId: data.id || videoId,
        title: data.title || "Video",
        description: data.description || "",
        thumbnail,
        duration: formatDuration(durationSeconds),
        durationSeconds: Math.round(durationSeconds),
        channelName: data.channel || data.uploader || "",
        channelId: data.channel_id || data.uploader_id || "",
        viewCount: data.view_count?.toString() || "0",
        publishDate: data.upload_date || "",
        isLive: !!data.is_live,
        isPrivate: false,
        formats: allFormats,
        videoFormats,
        videoOnlyFormats,
        audioOnlyFormats,
        bestVideoUrl: videoFormats[0]?.url || videoOnlyFormats[0]?.url || "",
        bestAudioUrl: audioOnlyFormats[0]?.url || "",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[youtube/video] ERROR:", msg.substring(0, 300));
    return NextResponse.json({ error: "Extraction failed.", message: msg }, { status: 500 });
  }
}
