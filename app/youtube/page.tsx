"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoResult {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  channelName: string;
  viewCount: string;
  publishedAt: string;
  isLive: boolean;
}

interface StreamFormat {
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
}

interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  channelName: string;
  viewCount: string;
  publishDate: string;
  formats: StreamFormat[];
  videoFormats: StreamFormat[];
  videoOnlyFormats: StreamFormat[];
  audioOnlyFormats: StreamFormat[];
  bestVideoUrl: string;
  bestAudioUrl: string;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatViews(s: string): string {
  const n = parseInt(s.replace(/,/g, ""));
  if (isNaN(n)) return s;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

function formatBytes(b?: string): string {
  if (!b) return "";
  const n = parseInt(b);
  if (isNaN(n)) return "";
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 ** 3)).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 ** 2)).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function getMimeShort(mime: string): string {
  const m = mime.match(/^(\w+)\/(\w+)/);
  if (!m) return mime;
  return m[2].toUpperCase();
}

// ─── Category list ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "🔥 Trending" },
  { id: "music", label: "🎵 Music" },
  { id: "gaming", label: "🎮 Gaming" },
  { id: "movies", label: "🎬 Movies" },
  { id: "news", label: "📰 News" },
  { id: "sports", label: "⚽ Sports" },
  { id: "learning", label: "📚 Learning" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function YouTubePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [trending, setTrending] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [error, setError] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<StreamFormat | null>(null);
  const [panel, setPanel] = useState<"info" | "formats">("info");
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Load trending on mount / category change ─────────────────────────────
  const loadTrending = useCallback(async (cat: string) => {
    setTrendingLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/youtube/trending?category=${cat}`);
      const data = await res.json();
      if (data.success) {
        setTrending(data.videos || []);
      } else {
        setError(data.message || "Failed to load trending");
      }
    } catch (e) {
      setError("Network error loading trending");
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending(activeCategory);
  }, [activeCategory, loadTrending]);

  // ── Search ──────────────────────────────────────────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setIsSearchMode(true);
    setSelectedVideo(null);
    setError("");
    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(query.trim())}&limit=24`
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
      } else {
        setError(data.message || "Search failed");
        setResults([]);
      }
    } catch {
      setError("Network error during search");
    } finally {
      setLoading(false);
    }
  };

  // ── Load video info ──────────────────────────────────────────────────────
  const loadVideo = async (videoId: string) => {
    setVideoLoading(true);
    setSelectedVideo(null);
    setSelectedQuality(null);
    setPanel("info");
    setError("");
    try {
      const res = await fetch(`/api/youtube/video?id=${videoId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedVideo(data.data);
        // Default quality: best muxed (has video+audio)
        const best =
          data.data.videoFormats?.[0] ||
          data.data.videoOnlyFormats?.[0] ||
          null;
        setSelectedQuality(best);
      } else {
        setError(data.message || "Failed to load video");
      }
    } catch {
      setError("Network error loading video info");
    } finally {
      setVideoLoading(false);
    }
  };

  const currentList = isSearchMode ? results : trending;

  return (
    <div className="yt-root">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="yt-header">
        <div className="yt-header-inner">
          <div
            className="yt-logo"
            onClick={() => {
              setIsSearchMode(false);
              setSelectedVideo(null);
              setQuery("");
              setError("");
            }}
          >
            <svg viewBox="0 0 28 20" className="yt-logo-svg" fill="none">
              <rect width="28" height="20" rx="5" fill="#FF0000" />
              <polygon points="11,5 11,15 20,10" fill="white" />
            </svg>
            <span>YTScraper</span>
          </div>

          <form className="yt-search-form" onSubmit={handleSearch}>
            <input
              ref={searchRef}
              className="yt-search-input"
              type="text"
              placeholder="Search YouTube..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              id="yt-search"
            />
            <button className="yt-search-btn" type="submit" id="btn-search">
              {loading ? (
                <span className="spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </form>

          <div className="yt-header-actions">
            <a
              href="/api/youtube/search?q=test"
              target="_blank"
              className="yt-api-badge"
            >
              API Docs
            </a>
          </div>
        </div>
      </header>

      <div className="yt-body">
        {/* ── Sidebar (categories) ────────────────────────────────────── */}
        {!selectedVideo && (
          <aside className="yt-sidebar">
            <div className="yt-sidebar-title">Categories</div>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                className={`yt-cat-btn ${activeCategory === cat.id && !isSearchMode ? "active" : ""}`}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setIsSearchMode(false);
                  setSelectedVideo(null);
                  setError("");
                }}
              >
                {cat.label}
              </button>
            ))}
            {isSearchMode && (
              <button
                className="yt-cat-btn"
                onClick={() => {
                  setIsSearchMode(false);
                  setSelectedVideo(null);
                  setError("");
                }}
              >
                ← Back to Trending
              </button>
            )}
          </aside>
        )}

        {/* ── Main content ────────────────────────────────────────────── */}
        <main className="yt-main">
          {error && (
            <div className="yt-error">
              <span>⚠️ {error}</span>
              <button onClick={() => setError("")}>✕</button>
            </div>
          )}

          {/* Video Detail Panel */}
          {selectedVideo && (
            <div className="yt-detail">
              <button
                className="yt-back-btn"
                id="btn-back"
                onClick={() => {
                  setSelectedVideo(null);
                  setSelectedQuality(null);
                }}
              >
                ← Back
              </button>

              <div className="yt-detail-inner">
                {/* Thumbnail preview + playback */}
                <div className="yt-player-area">
                  <div className="yt-thumb-wrap">
                    <img
                      src={selectedVideo.thumbnail}
                      alt={selectedVideo.title}
                      className="yt-detail-thumb"
                    />
                    <div className="yt-player-overlay">
                      <a
                        href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="yt-watch-btn"
                        id="btn-watch-yt"
                      >
                        ▶ Watch on YouTube
                      </a>
                      {selectedQuality && (
                        <a
                          href={selectedQuality.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="yt-direct-btn"
                          id="btn-direct-stream"
                        >
                          ⚡ Direct Stream
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="yt-meta-box">
                    <h1 className="yt-detail-title">{selectedVideo.title}</h1>
                    <div className="yt-detail-meta">
                      <span className="yt-channel">{selectedVideo.channelName}</span>
                      <span className="yt-sep">•</span>
                      <span>{formatViews(selectedVideo.viewCount)}</span>
                      <span className="yt-sep">•</span>
                      <span>⏱ {selectedVideo.duration}</span>
                      {selectedVideo.publishDate && (
                        <>
                          <span className="yt-sep">•</span>
                          <span>{selectedVideo.publishDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel tabs */}
                <div className="yt-panel-tabs">
                  <button
                    className={`yt-tab ${panel === "info" ? "active" : ""}`}
                    onClick={() => setPanel("info")}
                    id="tab-info"
                  >
                    ℹ️ Info
                  </button>
                  <button
                    className={`yt-tab ${panel === "formats" ? "active" : ""}`}
                    onClick={() => setPanel("formats")}
                    id="tab-formats"
                  >
                    📦 All Formats ({selectedVideo.formats.length})
                  </button>
                </div>

                {panel === "info" && (
                  <div className="yt-info-panel">
                    {/* Quick quality picker */}
                    <div className="yt-quality-section">
                      <h3>🎬 Video Qualities (with audio)</h3>
                      <div className="yt-quality-grid">
                        {selectedVideo.videoFormats.map((f) => (
                          <a
                            key={f.itag}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`yt-quality-pill ${
                              selectedQuality?.itag === f.itag ? "selected" : ""
                            }`}
                            id={`quality-${f.itag}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedQuality(f);
                              window.open(f.url, "_blank");
                            }}
                          >
                            {f.quality || f.qualityLabel}
                            <span className="yt-quality-meta">
                              {getMimeShort(f.mimeType)}
                              {f.fps ? ` ${f.fps}fps` : ""}
                            </span>
                          </a>
                        ))}
                        {selectedVideo.videoFormats.length === 0 && (
                          <span className="yt-muted">No combined streams</span>
                        )}
                      </div>

                      <h3 style={{ marginTop: "1rem" }}>🎵 Audio Only</h3>
                      <div className="yt-quality-grid">
                        {selectedVideo.audioOnlyFormats.map((f) => (
                          <a
                            key={f.itag}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="yt-quality-pill audio"
                            id={`audio-${f.itag}`}
                          >
                            {Math.round((f.bitrate || 0) / 1000)}kbps
                            <span className="yt-quality-meta">
                              {getMimeShort(f.mimeType)}
                            </span>
                          </a>
                        ))}
                        {selectedVideo.audioOnlyFormats.length === 0 && (
                          <span className="yt-muted">No audio-only streams</span>
                        )}
                      </div>

                      <h3 style={{ marginTop: "1rem" }}>📹 Video Only (DASH)</h3>
                      <div className="yt-quality-grid">
                        {selectedVideo.videoOnlyFormats.slice(0, 8).map((f) => (
                          <a
                            key={f.itag}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="yt-quality-pill video-only"
                            id={`vonly-${f.itag}`}
                          >
                            {f.quality || f.qualityLabel}
                            {f.fps ? ` ${f.fps}fps` : ""}
                            <span className="yt-quality-meta">
                              {getMimeShort(f.mimeType)}
                              {formatBytes(f.contentLength)
                                ? ` · ${formatBytes(f.contentLength)}`
                                : ""}
                            </span>
                          </a>
                        ))}
                        {selectedVideo.videoOnlyFormats.length === 0 && (
                          <span className="yt-muted">No DASH video streams</span>
                        )}
                      </div>
                    </div>

                    {selectedVideo.description && (
                      <div className="yt-description">
                        <h3>Description</h3>
                        <p>{selectedVideo.description.slice(0, 600)}{selectedVideo.description.length > 600 ? "…" : ""}</p>
                      </div>
                    )}
                  </div>
                )}

                {panel === "formats" && (
                  <div className="yt-formats-panel">
                    <table className="yt-formats-table">
                      <thead>
                        <tr>
                          <th>itag</th>
                          <th>Quality</th>
                          <th>Type</th>
                          <th>Codec</th>
                          <th>FPS</th>
                          <th>Bitrate</th>
                          <th>Size</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVideo.formats.map((f) => (
                          <tr key={f.itag}>
                            <td>
                              <code>{f.itag}</code>
                            </td>
                            <td>
                              <span
                                className={`yt-badge ${
                                  f.contentType === "video+audio"
                                    ? "badge-combo"
                                    : f.contentType === "audio"
                                    ? "badge-audio"
                                    : "badge-video"
                                }`}
                              >
                                {f.quality || f.qualityLabel || "?"}
                              </span>
                            </td>
                            <td className="yt-muted">{f.contentType}</td>
                            <td className="yt-muted">
                              {f.mimeType.split('"')[1] || getMimeShort(f.mimeType)}
                            </td>
                            <td className="yt-muted">{f.fps || "—"}</td>
                            <td className="yt-muted">
                              {f.bitrate
                                ? `${Math.round(f.bitrate / 1000)}kbps`
                                : "—"}
                            </td>
                            <td className="yt-muted">
                              {formatBytes(f.contentLength) || "—"}
                            </td>
                            <td>
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="yt-dl-link"
                                id={`dl-${f.itag}`}
                              >
                                Open ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Grid */}
          {!selectedVideo && (
            <>
              <div className="yt-grid-header">
                <h2>
                  {isSearchMode
                    ? `Search results for "${query}"`
                    : CATEGORIES.find((c) => c.id === activeCategory)?.label || "Trending"}
                </h2>
                {!isSearchMode && (
                  <span className="yt-count">{trending.length} videos</span>
                )}
              </div>

              {(trendingLoading && !isSearchMode) || (loading && isSearchMode) ? (
                <div className="yt-loading">
                  <div className="yt-spinner-big" />
                  <span>Loading...</span>
                </div>
              ) : currentList.length === 0 ? (
                <div className="yt-empty">
                  {isSearchMode
                    ? "No results found. Try a different search."
                    : "No trending videos found."}
                </div>
              ) : (
                <div className="yt-grid" id="video-grid">
                  {currentList.map((video) => (
                    <div
                      key={video.videoId}
                      className="yt-card"
                      id={`card-${video.videoId}`}
                      onClick={() => loadVideo(video.videoId)}
                    >
                      <div className="yt-card-thumb-wrap">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="yt-card-thumb"
                          loading="lazy"
                        />
                        {video.duration && (
                          <span className="yt-dur-badge">{video.duration}</span>
                        )}
                        {video.isLive && (
                          <span className="yt-live-badge">LIVE</span>
                        )}
                        <div className="yt-card-overlay">
                          <span className="yt-play-icon">▶</span>
                        </div>
                      </div>
                      <div className="yt-card-body">
                        <h3 className="yt-card-title">{video.title}</h3>
                        <div className="yt-card-meta">
                          <span className="yt-card-channel">{video.channelName}</span>
                          {video.viewCount && (
                            <span className="yt-card-views">
                              {formatViews(video.viewCount)}
                            </span>
                          )}
                          {video.publishedAt && (
                            <span className="yt-card-date">{video.publishedAt}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Video loading overlay */}
          {videoLoading && (
            <div className="yt-video-loading">
              <div className="yt-spinner-big" />
              <span>Extracting stream URLs...</span>
            </div>
          )}
        </main>
      </div>

      <style>{`
        /* ── Reset & Base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        .yt-root {
          --bg: #0f0f0f;
          --bg2: #181818;
          --bg3: #212121;
          --border: #303030;
          --red: #ff0000;
          --red2: #cc0000;
          --text: #f1f1f1;
          --text2: #aaa;
          --text3: #717171;
          --blue: #3ea6ff;
          --green: #2ecc71;
          --purple: #9c59ff;
          --orange: #ff9500;
          
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .yt-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(15,15,15,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          height: 60px;
        }
        .yt-header-inner {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 24px;
          height: 100%;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .yt-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex-shrink: 0;
          text-decoration: none;
        }
        .yt-logo-svg { width: 36px; height: 26px; }
        .yt-logo span {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: var(--text);
        }
        .yt-search-form {
          flex: 1;
          max-width: 600px;
          display: flex;
          gap: 0;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--bg2);
          transition: border-color 0.2s;
        }
        .yt-search-form:focus-within {
          border-color: var(--blue);
          box-shadow: 0 0 0 1px var(--blue);
        }
        .yt-search-input {
          flex: 1;
          padding: 10px 18px;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 0.95rem;
          outline: none;
        }
        .yt-search-input::placeholder { color: var(--text3); }
        .yt-search-btn {
          padding: 0 18px;
          background: var(--bg3);
          border: none;
          border-left: 1px solid var(--border);
          color: var(--text2);
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 0.15s, color 0.15s;
        }
        .yt-search-btn:hover { background: var(--border); color: var(--text); }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid var(--border);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .yt-header-actions { margin-left: auto; }
        .yt-api-badge {
          padding: 6px 14px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--blue);
          font-size: 0.8rem;
          text-decoration: none;
          transition: all 0.15s;
        }
        .yt-api-badge:hover { background: var(--blue); color: var(--bg); }

        /* ── Layout ── */
        .yt-body {
          flex: 1;
          display: flex;
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
          padding: 0;
        }

        /* ── Sidebar ── */
        .yt-sidebar {
          width: 200px;
          flex-shrink: 0;
          padding: 16px 0;
          border-right: 1px solid var(--border);
          position: sticky;
          top: 60px;
          height: calc(100vh - 60px);
          overflow-y: auto;
        }
        .yt-sidebar-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text3);
          padding: 0 16px 8px;
          font-weight: 600;
        }
        .yt-cat-btn {
          display: block;
          width: 100%;
          padding: 10px 16px;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--text2);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s;
          border-left: 3px solid transparent;
        }
        .yt-cat-btn:hover { background: var(--bg2); color: var(--text); }
        .yt-cat-btn.active { 
          color: var(--text); 
          background: var(--bg2);
          border-left-color: var(--red);
          font-weight: 600;
        }

        /* ── Main ── */
        .yt-main {
          flex: 1;
          padding: 20px 24px;
          min-width: 0;
        }

        /* ── Error ── */
        .yt-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255,0,0,0.1);
          border: 1px solid rgba(255,0,0,0.3);
          border-radius: 8px;
          margin-bottom: 16px;
          color: #ff6b6b;
          font-size: 0.9rem;
        }
        .yt-error button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 1rem;
        }

        /* ── Grid header ── */
        .yt-grid-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .yt-grid-header h2 { font-size: 1.1rem; font-weight: 600; }
        .yt-count {
          font-size: 0.8rem;
          color: var(--text3);
          background: var(--bg3);
          padding: 2px 8px;
          border-radius: 10px;
        }

        /* ── Video Grid ── */
        .yt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .yt-card {
          background: var(--bg2);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid transparent;
        }
        .yt-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          border-color: var(--border);
        }
        .yt-card-thumb-wrap {
          position: relative;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: var(--bg3);
        }
        .yt-card-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .yt-card:hover .yt-card-thumb { transform: scale(1.04); }
        .yt-dur-badge {
          position: absolute;
          bottom: 6px; right: 6px;
          background: rgba(0,0,0,0.85);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .yt-live-badge {
          position: absolute;
          top: 6px; left: 6px;
          background: var(--red);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .yt-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .yt-card:hover .yt-card-overlay { background: rgba(0,0,0,0.35); }
        .yt-play-icon {
          font-size: 2.5rem;
          color: #fff;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.2s;
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        .yt-card:hover .yt-play-icon { opacity: 1; transform: scale(1); }
        .yt-card-body { padding: 12px 14px 14px; }
        .yt-card-title {
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .yt-card-meta { display: flex; flex-direction: column; gap: 2px; }
        .yt-card-channel { color: var(--text2); font-size: 0.8rem; }
        .yt-card-views, .yt-card-date {
          color: var(--text3);
          font-size: 0.75rem;
        }

        /* ── Loading ── */
        .yt-loading, .yt-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          height: 300px;
          color: var(--text3);
          font-size: 1rem;
        }
        .yt-spinner-big {
          width: 42px; height: 42px;
          border: 3px solid var(--border);
          border-top-color: var(--red);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ── Video loading overlay ── */
        .yt-video-loading {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 200;
          color: var(--text);
          font-size: 1rem;
          backdrop-filter: blur(4px);
        }

        /* ── Detail View ── */
        .yt-detail { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .yt-back-btn {
          background: var(--bg2);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          margin-bottom: 20px;
          transition: all 0.15s;
        }
        .yt-back-btn:hover { background: var(--bg3); border-color: var(--text3); }
        
        .yt-detail-inner {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .yt-player-area {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .yt-player-area { grid-template-columns: 1fr; }
          .yt-sidebar { display: none; }
          .yt-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
        }
        .yt-thumb-wrap {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg3);
          aspect-ratio: 16/9;
        }
        .yt-detail-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .yt-player-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .yt-thumb-wrap:hover .yt-player-overlay { opacity: 1; }
        .yt-watch-btn, .yt-direct-btn {
          padding: 10px 22px;
          border-radius: 24px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s;
          display: inline-block;
        }
        .yt-watch-btn {
          background: var(--red);
          color: #fff;
        }
        .yt-watch-btn:hover { background: var(--red2); }
        .yt-direct-btn {
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
        }
        .yt-direct-btn:hover { background: rgba(255,255,255,0.25); }

        .yt-meta-box { display: flex; flex-direction: column; gap: 10px; }
        .yt-detail-title {
          font-size: 1.2rem;
          font-weight: 700;
          line-height: 1.4;
        }
        .yt-detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          color: var(--text2);
          font-size: 0.88rem;
        }
        .yt-channel { color: var(--blue); font-weight: 500; }
        .yt-sep { color: var(--text3); }

        /* ── Tabs ── */
        .yt-panel-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border);
        }
        .yt-tab {
          padding: 10px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text2);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: -1px;
        }
        .yt-tab:hover { color: var(--text); }
        .yt-tab.active {
          color: var(--text);
          border-bottom-color: var(--red);
          font-weight: 600;
        }

        /* ── Info Panel ── */
        .yt-info-panel { padding: 16px 0; display: flex; flex-direction: column; gap: 4px; }
        .yt-quality-section h3 {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text2);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .yt-quality-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 4px;
        }
        .yt-quality-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 14px;
          border-radius: 8px;
          background: var(--bg2);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 70px;
          text-align: center;
        }
        .yt-quality-pill:hover, .yt-quality-pill.selected {
          background: var(--red);
          border-color: var(--red);
          color: #fff;
        }
        .yt-quality-pill.audio:hover { background: var(--green); border-color: var(--green); }
        .yt-quality-pill.video-only:hover { background: var(--purple); border-color: var(--purple); }
        .yt-quality-meta {
          font-size: 0.7rem;
          font-weight: 400;
          opacity: 0.7;
          margin-top: 2px;
        }
        .yt-muted { color: var(--text3); font-size: 0.85rem; }
        
        .yt-description {
          background: var(--bg2);
          border-radius: 10px;
          padding: 16px;
          margin-top: 8px;
        }
        .yt-description h3 {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text2);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .yt-description p {
          color: var(--text2);
          font-size: 0.88rem;
          line-height: 1.6;
          white-space: pre-line;
        }

        /* ── Formats Table ── */
        .yt-formats-panel { overflow-x: auto; padding-top: 12px; }
        .yt-formats-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .yt-formats-table th {
          text-align: left;
          padding: 8px 12px;
          color: var(--text3);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }
        .yt-formats-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .yt-formats-table tr:hover td { background: var(--bg2); }
        .yt-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .badge-combo { background: rgba(255,0,0,0.15); color: #ff6b6b; }
        .badge-audio { background: rgba(46,204,113,0.15); color: var(--green); }
        .badge-video { background: rgba(156,89,255,0.15); color: var(--purple); }
        .yt-dl-link {
          color: var(--blue);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }
        .yt-dl-link:hover { color: #fff; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text3); }
      `}</style>
    </div>
  );
}
