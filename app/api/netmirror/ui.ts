export function getNetMirrorUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NetMirror - Advanced UI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
  <style>
    :root {
      --primary: #e50914;
      --bg: #0f1014;
      --bg-card: #18191f;
      --text: #e1e1e1;
    }
    body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--primary); }

    .glass-nav {
      background: rgba(15, 16, 20, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .platform-btn {
      transition: all 0.3s ease;
    }
    .platform-btn.active {
      background: var(--primary);
      color: white;
      transform: scale(1.05);
      box-shadow: 0 4px 15px var(--primary-glow);
    }
    .platform-btn:hover:not(.active) {
      background: rgba(255,255,255,0.1);
    }
    /* Platform-specific accent vars */
    body.platform-prime { --primary: #00a8e1; --primary-glow: rgba(0,168,225,0.4); }
    body.platform-disney { --primary: #113ccf; --primary-glow: rgba(17,60,207,0.4); }
    body.platform-netflix { --primary: #e50914; --primary-glow: rgba(229,9,20,0.4); }
    
    .movie-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: var(--bg-card);
      border: 1px solid transparent;
    }
    .movie-card:hover {
      transform: translateY(-8px) scale(1.02);
      border-color: rgba(255,255,255,0.1);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .movie-card img {
      transition: all 0.3s ease;
    }
    .movie-card:hover img {
      opacity: 0.8;
    }

    #player-container {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.95);
      z-index: 1000;
      backdrop-filter: blur(10px);
    }
    #player-wrapper {
      position: relative;
      width: 90%;
      max-width: 1200px;
      margin: 2% auto;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
    }
    video { width: 100%; aspect-ratio: 16/9; background: #000; outline: none; }
    .close-btn {
      position: absolute; top: 15px; right: 20px;
      color: white; font-size: 30px; cursor: pointer;
      z-index: 1010; transition: color 0.2s;
    }
    .close-btn:hover { color: var(--primary); }

    .loader {
      border: 3px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      border-top: 3px solid var(--primary);
      width: 40px; height: 40px;
      animation: spin 1s linear infinite;
      margin: 40px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .fade-in { animation: fadeIn 0.4s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body class="platform-netflix">

  <!-- Navbar -->
  <nav class="glass-nav fixed w-full z-50 top-0 left-0 transition-all">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <i class="fa-solid fa-play text-red-600 text-2xl"></i>
          <span class="font-bold text-xl tracking-wider text-white">NetMirror <span class="text-xs text-red-500 font-medium ml-1">v2</span></span>
        </div>
        <div class="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
          <div class="max-w-lg w-full lg:max-w-xs relative">
            <input id="searchInput" class="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full leading-5 bg-gray-800 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white focus:text-gray-900 focus:ring-2 focus:ring-red-600 sm:text-sm transition-all" placeholder="Search movies, series..." type="search">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fa-solid fa-search text-gray-400"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
    
    <!-- Platforms -->
    <div class="flex flex-wrap gap-4 mb-10 justify-center">
      <button id="btn-netflix" class="platform-btn active px-6 py-2.5 rounded-full font-medium text-sm tracking-wide" onclick="setPlatform('netflix', event)">
        <i class="fa-brands fa-neos mr-2"></i> Netflix
      </button>
      <button id="btn-prime" class="platform-btn px-6 py-2.5 rounded-full font-medium text-sm tracking-wide bg-gray-800" onclick="setPlatform('prime', event)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="inline mr-1" style="color:#00a8e1"><path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.5-.256.19-.6.41-1.006.67-1.94 1.16-4.025 1.74-6.257 1.74-2.02 0-3.86-.44-5.52-1.32l-.12-.07c-.22-.12-.42-.19-.57-.19-.12 0-.21.03-.28.09-.41.36-.92.77-1.52 1.24-.3.23-.62.35-.95.35-.46 0-.87-.19-1.22-.57-.3-.33-.45-.72-.45-1.18 0-.18.02-.34.07-.49zm10.5-7.09l.66-.27c.3-.12.55-.08.74.12.19.2.18.43-.03.68l-.62.66c-.115.126-.237.18-.37.164-.13-.015-.244-.086-.34-.21l-.28-.36c-.12-.18-.12-.37.02-.57l.21-.22zm8.73-1.56c.43.4.65.88.65 1.43 0 .55-.22 1.02-.65 1.42-.43.4-.96.6-1.6.6-.62 0-1.15-.2-1.58-.6-.43-.4-.65-.87-.65-1.42 0-.55.22-1.03.65-1.43.43-.4.96-.6 1.58-.6.64 0 1.17.2 1.6.6zm-16.1.5c.3-.72.75-1.26 1.36-1.63.6-.37 1.27-.55 2-.55.74 0 1.4.18 2 .55.6.37 1.04.91 1.34 1.63H3.175zm18.7-.17c-.34-.73-.82-1.28-1.44-1.67-.62-.38-1.32-.57-2.08-.57-.77 0-1.46.19-2.08.57-.62.39-1.1.94-1.44 1.67h7.04z"/></svg> Prime Video
      </button>
      <a href="/pv/" target="_blank" class="px-4 py-2 rounded-full font-medium text-xs tracking-wide bg-cyan-900 text-cyan-300 border border-cyan-700 hover:bg-cyan-800 transition flex items-center gap-1" title="Open Prime Video SPA (Full Experience)">
        <i class="fa-solid fa-external-link-alt text-xs"></i> Prime SPA
      </a>
    </div>

    <!-- Status/Title -->
    <h2 id="sectionTitle" class="text-2xl font-bold mb-6 flex items-center gap-2">
      <i class="fa-solid fa-fire text-red-500"></i> Trending Now
    </h2>

    <!-- Grid -->
    <div id="resultsGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      <!-- Loader initially -->
      <div class="col-span-full">
         <div class="loader"></div>
      </div>
    </div>
  </main>

  <!-- Details Modal -->
  <div id="detailsModal" class="hidden fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-black bg-opacity-80 transition-opacity backdrop-blur-sm" onclick="closeDetails()"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-800">
        <div class="relative w-full h-64 sm:h-80 bg-gray-800" id="detailCover">
           <button onclick="closeDetails()" class="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10">
             <i class="fa-solid fa-xmark"></i>
           </button>
           <div class="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
        </div>
        
        <div class="px-6 pb-8 pt-4 relative -mt-16 sm:-mt-24 z-10">
          <div class="flex justify-between items-end mb-4">
            <h3 class="text-3xl sm:text-4xl font-bold text-white shadow-sm" id="detailTitle">Loading...</h3>
          </div>
          <div class="flex flex-wrap gap-2 text-xs font-semibold text-gray-300 mb-6" id="detailBadges">
             <!-- Badges here -->
          </div>
          <p class="text-gray-400 text-sm sm:text-base leading-relaxed mb-6" id="detailDesc"></p>
          
          <div id="actionArea" class="mb-4">
            <!-- Buttons or Episodes here -->
            <div class="loader m-0"></div>
          </div>
          
        </div>
      </div>
    </div>
  </div>

  <!-- Player Overlay -->
  <div id="player-container">
    <div class="close-btn" onclick="closePlayer()"><i class="fa-solid fa-xmark"></i></div>
    <div id="player-wrapper">
      <video id="video-element" controls crossorigin="anonymous"></video>
      
      <!-- Controls Bar -->
      <div id="playerControls" class="hidden" style="background:rgba(0,0,0,0.85);padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-film" style="color:#e50914;font-size:12px;"></i>
          <label style="font-size:12px;color:#aaa;font-family:sans-serif;">Quality</label>
          <select id="qualitySelect" onchange="switchQuality(this.value)"
            style="background:#1a1a2e;color:#fff;border:1px solid #333;padding:4px 10px;border-radius:6px;font-size:13px;outline:none;cursor:pointer;">
            <option>Loading...</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <i class="fa-solid fa-microphone" style="color:#e50914;font-size:12px;"></i>
          <label style="font-size:12px;color:#aaa;font-family:sans-serif;">Audio</label>
          <select id="audioSelect" onchange="switchAudio(this.value)"
            style="background:#1a1a2e;color:#fff;border:1px solid #333;padding:4px 10px;border-radius:6px;font-size:13px;outline:none;cursor:pointer;">
            <option value="-1">Default</option>
          </select>
        </div>
        <div id="playerTitle" style="margin-left:auto;font-size:12px;color:#888;font-family:sans-serif;max-width:300px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;"></div>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = window.location.pathname;
    let currentPlatform = 'netflix';
    let hlsInstance = null;
    let streamSources = [];   // [{label, file, default}]
    let currentQualityIdx = 0;

    const grid = document.getElementById('resultsGrid');
    const searchInput = document.getElementById('searchInput');
    const sectionTitle = document.getElementById('sectionTitle');

    window.onload = () => {
      fetchHome();
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (q) fetchSearch(q); else fetchHome();
        }
      });
    };

    function setPlatform(pf, evt) {
      currentPlatform = pf;
      document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('btn-' + pf);
      if (btn) btn.classList.add('active');
      document.body.className = document.body.className.replace(/platform-\S+/g, '').trim();
      document.body.classList.add('platform-' + pf);
      searchInput.value = '';

      const platformTitles = {
        netflix: '<i class="fa-solid fa-fire text-red-500"></i> Netflix \u2014 Trending Now',
        prime: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#00a8e1" class="inline mr-1"><path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.5-.256.19-.6.41-1.006.67-1.94 1.16-4.025 1.74-6.257 1.74-2.02 0-3.86-.44-5.52-1.32l-.12-.07c-.22-.12-.42-.19-.57-.19-.12 0-.21.03-.28.09z"/></svg> Amazon Prime Video \u2014 Featured',
      };
      const title = platformTitles[pf] || pf;
      fetchPlatform(pf, title);
    }

    async function fetchHome() {
      sectionTitle.innerHTML = '<i class="fa-solid fa-fire text-red-500"></i> Netflix \u2014 Trending Now';
      grid.innerHTML = '<div class="col-span-full"><div class="loader"></div></div>';
      try {
        // Use curated Netflix platform content (home scrape is SPA-rendered, unreliable)
        const res = await fetch(API_BASE + '?action=platform&p=netflix');
        const json = await res.json();
        if (json.success && json.data.items && json.data.items.length > 0) {
          renderGrid(json.data.items, false);
        } else {
          grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Search for a movie above to get started!</div>';
        }
      } catch(e) {
        grid.innerHTML = \`<div class="col-span-full text-center text-gray-500 py-10">Search for a movie above.</div>\`;
      }
    }

    async function fetchPlatform(platform, titleHtml) {
      sectionTitle.innerHTML = titleHtml;
      grid.innerHTML = '<div class="col-span-full"><div class="loader"></div></div>';
      try {
        const res = await fetch(API_BASE + '?action=platform&p=' + platform);
        const json = await res.json();
        if (json.success && json.data.items && json.data.items.length > 0) {
          renderGrid(json.data.items, false);
        } else {
          grid.innerHTML = \`<div class="col-span-full text-center text-gray-500 py-10">No content found. Try searching!</div>\`;
        }
      } catch(e) {
        grid.innerHTML = \`<div class="col-span-full text-center text-red-500 py-10">Error loading platform content: \${e.message}</div>\`;
      }
    }

    async function fetchSearch(q) {
      sectionTitle.innerHTML = \`<i class="fa-solid fa-search text-gray-400"></i> Results for "\${q}"\`;
      grid.innerHTML = '<div class="col-span-full"><div class="loader"></div></div>';
      try {
        const res = await fetch(API_BASE + '?action=search&q=' + encodeURIComponent(q));
        const json = await res.json();
        let results = [];
        const sr = json.data?.searchResults?.searchResult || json.data?.searchResults;
        if (Array.isArray(sr)) {
          results = sr.map(item => ({
            id: item.id || item.v_id,
            title: item.t || item.title || 'Unknown',
            imageUrl: item.id ? \`https://imgcdn.kim/poster/341/\${item.id}.jpg\` : '',
            category: 'Search Result'
          }));
        }
        if (results.length > 0) renderGrid(results, true);
        else grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No results found</div>';
      } catch(e) {
        grid.innerHTML = \`<div class="col-span-full text-center text-red-500 py-10">\${e.message}</div>\`;
      }
    }

    function renderGrid(items, isSearch) {
      grid.innerHTML = '';
      items.forEach(item => {
        if (!item.title) return;
        const div = document.createElement('div');
        div.className = 'movie-card rounded-xl overflow-hidden cursor-pointer relative group flex flex-col fade-in';
        div.onclick = () => openDetails(item.id, item.title, item.imageUrl);
        const imgSrc = item.imageUrl && item.imageUrl.includes('http') ? item.imageUrl
          : 'https://placehold.co/300x450/111/444?text=' + encodeURIComponent(item.title);
        div.innerHTML = \`
          <div class="relative aspect-[2/3] w-full overflow-hidden">
            <img src="\${imgSrc}" loading="lazy" class="w-full h-full object-cover" alt="\${item.title}">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
              <i class="fa-solid fa-play text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg scale-75 group-hover:scale-100"></i>
            </div>
            <div class="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow">\${item.category || (isSearch ? 'Movie/Series' : 'New')}</div>
          </div>
          <div class="p-3 bg-gray-900 border-t border-gray-800">
            <h3 class="font-semibold text-sm truncate text-gray-100" title="\${item.title}">\${item.title}</h3>
          </div>
        \`;
        grid.appendChild(div);
      });
    }

    async function openDetails(id, fallbackTitle, fallbackImg) {
      document.getElementById('detailsModal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      document.getElementById('detailTitle').textContent = fallbackTitle;
      document.getElementById('detailDesc').textContent = 'Fetching details...';
      document.getElementById('detailBadges').innerHTML = '';
      const cover = document.getElementById('detailCover');
      cover.style.backgroundImage = \`url(\${fallbackImg})\`;
      cover.style.backgroundSize = 'cover';
      cover.style.backgroundPosition = 'center 20%';
      document.getElementById('actionArea').innerHTML = '<div class="loader m-0"></div>';

      try {
        const res = await fetch(API_BASE + '?action=getpost&id=' + id);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          document.getElementById('detailTitle').textContent = d.title || fallbackTitle;
          document.getElementById('detailDesc').textContent = d.m_desc || d.desc || 'No description available.';

          let badges = '';
          if (d.year)    badges += \`<span class="bg-gray-800 px-2 py-1 rounded border border-gray-700">\${d.year}</span>\`;
          if (d.ua)      badges += \`<span class="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-yellow-400">\${d.ua}</span>\`;
          if (d.runtime) badges += \`<span class="bg-gray-800 px-2 py-1 rounded border border-gray-700">\${d.runtime}</span>\`;
          if (d.hdsd)    badges += \`<span class="bg-red-700 px-2 py-1 rounded font-bold">\${d.hdsd}</span>\`;
          if (d.lang && Array.isArray(d.lang)) {
            badges += \`<span class="bg-gray-800 px-2 py-1 rounded border border-gray-700"><i class="fa-solid fa-microphone text-gray-400 mr-1"></i>\${d.lang.map(l=>l.l).join(', ')}</span>\`;
          }
          document.getElementById('detailBadges').innerHTML = badges;

          let actionsHtml = '';
          if (d.episodes && Array.isArray(d.episodes) && d.episodes.length > 0 && d.episodes[0]) {
            actionsHtml += \`<div class="mt-4"><h4 class="text-lg font-bold mb-3 border-b border-gray-800 pb-2">Episodes</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">\`;
            d.episodes.forEach(ep => {
              actionsHtml += \`<button onclick="closeDetails();playStream('\${ep.id}','\${(ep.t||'Episode').replace(/'/g,'')}')" class="flex gap-3 text-left w-full hover:bg-gray-800 p-2 rounded border border-gray-800 transition-colors group">
                <div class="w-9 h-9 bg-gray-800 rounded flex items-center justify-center text-gray-400 group-hover:text-red-500 shrink-0"><i class="fa-solid fa-play text-xs"></i></div>
                <div><div class="text-sm font-semibold text-gray-200 truncate">\${ep.ep}. \${ep.t||'Episode'}</div><div class="text-xs text-gray-500">\${ep.time||''}</div></div>
              </button>\`;
            });
            actionsHtml += '</div></div>';
          } else {
            actionsHtml = \`<button onclick="closeDetails();playStream('\${id}','\${(d.title||fallbackTitle).replace(/'/g,'')}')" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 flex items-center gap-2"><i class="fa-solid fa-play"></i> Watch Now</button>\`;
          }
          document.getElementById('actionArea').innerHTML = actionsHtml;
        }
      } catch(e) {
        document.getElementById('actionArea').innerHTML = \`<div class="text-red-500">Error loading details.</div>\`;
      }
    }

    function closeDetails() {
      document.getElementById('detailsModal').classList.add('hidden');
      document.body.style.overflow = '';
    }

    async function playStream(streamId, title) {
      document.getElementById('player-container').style.display = 'block';
      document.getElementById('playerControls').classList.remove('hidden');
      document.getElementById('playerControls').style.display = 'flex';
      document.getElementById('playerTitle').textContent = title || '';
      document.getElementById('qualitySelect').innerHTML = '<option>Loading...</option>';
      document.getElementById('audioSelect').innerHTML = '<option value="-1">Loading...</option>';

      const video = document.getElementById('video-element');
      if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
      video.src = '';

      try {
        const res = await fetch(API_BASE + '?action=stream&id=' + streamId);
        const json = await res.json();
        
        if (!json.success || !json.data?.streamData?.[0]?.sources?.length) {
          alert('No stream found for this item.');
          closePlayer();
          return;
        }

        const allSources = json.data.streamData[0].sources;
        streamSources = allSources;

        // Use the MASTER playlist (the one WITHOUT q= parameter — has all qualities + all audio tracks)
        // It's identified as the source whose proxied URL contains the base /hls/ path without q=
        // Usually it's the first source labeled "Full HD" or the one marked default
        const masterSource = allSources.find(s => 
          !s.file.includes('q%3D') && !s.file.includes('q=')  // no quality filter = master
        ) || allSources[0];

        // Build quality dropdown using source labels (for manual quality switching)
        let qHtml = '<option value="-1">Auto</option>';
        allSources.forEach((s, i) => {
          const label = s.label || ('Quality ' + (i + 1));
          qHtml += \`<option value="\${i}">\${label}</option>\`;
        });
        document.getElementById('qualitySelect').innerHTML = qHtml;
        document.getElementById('qualitySelect').value = '-1'; // Start on Auto

        loadMasterStream(masterSource.file);

      } catch(e) {
        alert('Stream error: ' + e.message);
        closePlayer();
      }
    }

    // Load using master m3u8 — HLS.js handles quality levels + audio tracks natively
    function loadMasterStream(masterUrl) {
      const video = document.getElementById('video-element');
      if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
      video.src = '';

      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          enableWorker: true,
          maxBufferLength: 30,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 4,
          startLevel: 1 // Start at mid quality (720p usually)
        });

        hlsInstance.loadSource(masterUrl);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function(evt, data) {
          video.play().catch(() => {});
          
          // Update quality dropdown with actual HLS levels sorted by height desc
          const levels = hlsInstance.levels;
          if (levels && levels.length > 0) {
            const sortedIdxs = levels
              .map((lvl, i) => ({ i, h: lvl.height || 0 }))
              .sort((a, b) => b.h - a.h);
            
            let qHtml = '<option value="-1">🔄 Auto</option>';
            sortedIdxs.forEach(({ i, h }) => {
              const label = h ? h + 'p' : ('Level ' + (i + 1));
              const icon = h >= 1080 ? '🔵' : h >= 720 ? '🟢' : '🟡';
              qHtml += \`<option value="\${i}">\${icon} \${label}</option>\`;
            });
            const sel = document.getElementById('qualitySelect');
            sel.innerHTML = qHtml;
            sel.value = '-1';
          }
        });

        // AUDIO_TRACKS_UPDATED — fires when all EXT-X-MEDIA audio tracks are discovered
        hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, function(evt, data) {
          const audioTracks = hlsInstance.audioTracks;
          console.log('[HLS] Audio tracks:', audioTracks.length, audioTracks.map(t=>t.name));
          const audioSel = document.getElementById('audioSelect');
          if (audioTracks && audioTracks.length > 0) {
            let aHtml = '';
            audioTracks.forEach((track, i) => {
              const label = track.name || track.lang || ('Audio ' + (i + 1));
              aHtml += \`<option value="\${i}">\${label}</option>\`;
            });
            audioSel.innerHTML = aHtml;
            // Try to default to Hindi, else first track
            const hindiIdx = audioTracks.findIndex(t =>
              (t.name || '').toLowerCase().includes('hindi') ||
              (t.lang || '').toLowerCase() === 'hin'
            );
            const defIdx = hindiIdx >= 0 ? hindiIdx : 0;
            hlsInstance.audioTrack = defIdx;
            audioSel.value = defIdx;
          } else {
            audioSel.innerHTML = '<option value="-1">Default</option>';
          }
        });

        hlsInstance.on(Hls.Events.AUDIO_TRACK_SWITCHED, function(evt, data) {
          const audioSel = document.getElementById('audioSelect');
          if (audioSel) audioSel.value = data.id;
        });

        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, function(evt, data) {
          const sel = document.getElementById('qualitySelect');
          if (sel && sel.value !== '-1') sel.value = data.level;
        });

        hlsInstance.on(Hls.Events.ERROR, function(evt, data) {
          console.error('HLS Error:', data.type, data.details, data.fatal);
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR: hlsInstance.startLoad(); break;
              case Hls.ErrorTypes.MEDIA_ERROR: hlsInstance.recoverMediaError(); break;
              default: console.error('Unrecoverable HLS error');
            }
          }
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = masterUrl;
        video.play().catch(() => {});
      }
    }

    // Quality switching via HLS.js native level control — NO stream reload!
    function loadQuality(idx) {
      if (!hlsInstance) return;
      if (idx === -1) {
        // Auto: let HLS.js ABR choose level
        hlsInstance.currentLevel = -1;
        hlsInstance.nextLevel = -1;
      } else {
        // Force specific quality level
        hlsInstance.currentLevel = idx;
        hlsInstance.nextLevel = idx;
      }
    }

    window.switchQuality = function(val) {
      loadQuality(parseInt(val));
    };

    window.switchAudio = function(val) {
      const idx = parseInt(val);
      if (hlsInstance && idx >= 0) {
        hlsInstance.audioTrack = idx;
      }
    };

    function closePlayer() {
      document.getElementById('player-container').style.display = 'none';
      document.getElementById('playerControls').style.display = 'none';
      document.getElementById('playerControls').classList.add('hidden');
      const video = document.getElementById('video-element');
      if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
      video.src = '';
      streamSources = [];
    }
  </script>
</body>
</html>`;
}
