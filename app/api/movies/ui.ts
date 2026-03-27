export function getMoviesUI() {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CinemaHub Universal</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #09090b;
      --bg-card: #18181b;
      --bg-hover: #27272a;
      --primary: #e11d48;
      --primary-hover: #be123c;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #27272a;
      --glass: rgba(24, 24, 27, 0.7);
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
    
    /* Header */
    header {
      position: sticky; top: 0; z-index: 50;
      background: var(--glass); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;
    }
    .brand { font-size: 1.5rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px; }
    
    .nav-controls { display: flex; gap: 1rem; align-items: center; }
    .provider-select {
      background: var(--bg-card); color: var(--text); border: 1px solid var(--border);
      padding: 0.5rem 1rem; border-radius: 8px; font-weight: 500; cursor: pointer; outline: none; transition: 0.2s;
    }
    .provider-select:hover { border-color: var(--primary); }
    
    .search-box {
      display: flex; align-items: center; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: 99px; padding: 0.25rem 1rem;
      transition: 0.3s;
    }
    .search-box:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2); }
    .search-box input {
      background: transparent; border: none; color: white; padding: 0.5rem;
      outline: none; width: 250px; font-size: 0.95rem;
    }
    .search-box button { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
    
    /* Main Grid */
    main { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem;
    }
    
    /* Movie Card */
    .card {
      background: var(--bg-card); border-radius: 12px; overflow: hidden;
      border: 1px solid var(--border); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer; display: flex; flex-direction: column; position: relative;
    }
    .card:hover { transform: translateY(-8px); border-color: var(--primary); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.15); }
    .card-img { width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #27272a; }
    .card-content { padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .card-title { font-weight: 600; font-size: 1rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .badge { background: var(--bg); border: 1px solid var(--border); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--text-muted); }
    .quality-badge { background: rgba(225, 29, 72, 0.1); color: var(--primary); border: 1px solid rgba(225, 29, 72, 0.2); }
    
    /* Pagination */
    .pagination { display: flex; justify-content: center; gap: 1rem; margin-top: 3rem; align-items: center; }
    .btn { background: var(--bg-card); color: white; border: 1px solid var(--border); padding: 0.5rem 1.25rem; border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: 600; }
    .btn:hover:not(:disabled) { background: var(--primary); border-color: var(--primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    /* Modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8);
      backdrop-filter: blur(5px); z-index: 100; display: none; justify-content: center; align-items: center; padding: 1rem;
    }
    .modal {
      background: var(--bg); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 900px;
      max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      animation: modalFadeIn 0.3s ease-out;
    }
    @keyframes modalFadeIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .modal-close {
      position: absolute; top: 1rem; right: 1rem; background: var(--bg-card); border: 1px solid var(--border);
      color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 10; transition: 0.2s;
    }
    .modal-close:hover { background: var(--primary); border-color: var(--primary); }
    
    .modal-hero { position: relative; width: 100%; height: 300px; }
    .modal-hero-bg { width: 100%; height: 100%; object-fit: cover; opacity: 0.3; mask-image: linear-gradient(to bottom, black 50%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%); }
    .modal-content { padding: 2rem; position: relative; margin-top: -150px; display: flex; gap: 2rem; }
    @media(max-width: 768px) { .modal-content { flex-direction: column; margin-top: -50px; } }
    .modal-poster { width: 200px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid var(--border); flex-shrink: 0; }
    .modal-info { flex: 1; }
    .modal-title { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; line-height: 1.2; }
    .modal-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-top: 1rem; }
    
    /* Download Section */
    .download-section { margin-top: 2rem; }
    .download-section h3 { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem; }
    .download-group { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 1rem; padding: 1rem; }
    .dl-header { font-weight: 700; color: var(--text); margin-bottom: 8px; display: flex; justify-content: space-between; }
    .dl-links { display: flex; flex-wrap: wrap; gap: 8px; }
    .dl-btn {
      background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 8px;
      text-decoration: none; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;
      transition: 0.2s; cursor: pointer;
    }
    .dl-btn:hover { background: var(--primary-hover); border-color: var(--primary); }
    .dl-btn.resolving { opacity: 0.7; pointer-events: none; border-color: #eab308; color: #eab308; }
    
    /* Toast */
    .toast { position: fixed; bottom: 20px; right: 20px; background: #fff; color: #000; padding: 12px 20px; border-radius: 8px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: translateY(100px); opacity: 0; transition: 0.3s; z-index: 1000; }
    .toast.show { transform: translateY(0); opacity: 1; }
    .toast.error { background: var(--primary); color: white; }

    /* Loader */
    .loader { margin: 4rem auto; text-align: center; color: var(--text-muted); font-size: 1.2rem; }
    .loader i { animation: spin 1s linear infinite; margin-right: 8px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <header>
    <div class="brand"><i class="fas fa-play-circle"></i> CinemaHub</div>
    <div class="nav-controls">
      <select class="provider-select" id="providerSelect">
        <option value="drive">MoviesDrive</option>
        <option value="hdhub4u">HDHub4u</option>
        <option value="4khdhub">4kHDHub</option>
        <option value="modlist/moviesleech">MoviesLeech (Bolly)</option>
        <option value="modlist/moviesmod">MoviesMod (Holly)</option>
        <option value="modlist/animeflix">AnimeFlix</option>
        <option value="modlist/uhdmovies">UHDMovies (4K)</option>
      </select>
      <form class="search-box" id="searchForm">
        <input type="text" id="searchInput" placeholder="Search movies...">
        <button type="submit"><i class="fas fa-search"></i></button>
      </form>
    </div>
  </header>

  <main>
    <div id="loader" class="loader"><i class="fas fa-circle-notch"></i> Loading amazing content...</div>
    <div id="grid" class="grid"></div>
    
    <div class="pagination" id="pagination">
      <button class="btn" id="prevBtn"><i class="fas fa-chevron-left"></i> Prev</button>
      <span id="pageBadge" class="badge">Page 1</span>
      <button class="btn" id="nextBtn">Next <i class="fas fa-chevron-right"></i></button>
    </div>
  </main>

  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <button class="modal-close" id="modalClose"><i class="fas fa-times"></i></button>
      <div class="modal-hero">
        <img src="" id="modalBg" class="modal-hero-bg">
      </div>
      <div class="modal-content">
        <img src="" id="modalPoster" class="modal-poster">
        <div class="modal-info">
          <h2 class="modal-title" id="modalTitle">Loading...</h2>
          <div class="card-meta" id="modalMeta"></div>
          <p class="modal-desc" id="modalDesc"></p>
          
          <div class="download-section">
            <h3><i class="fas fa-download"></i> Direct Downloads</h3>
            <div id="downloadArea">
              <div class="loader"><i class="fas fa-circle-notch"></i> Fetching links completely ad-free...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    let state = {
      provider: 'drive',
      page: 1,
      query: '',
      loading: false
    };

    const els = {
      grid: document.getElementById('grid'),
      loader: document.getElementById('loader'),
      providerSelect: document.getElementById('providerSelect'),
      searchForm: document.getElementById('searchForm'),
      searchInput: document.getElementById('searchInput'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      pageBadge: document.getElementById('pageBadge'),
      // Modal
      modalOverlay: document.getElementById('modalOverlay'),
      modalClose: document.getElementById('modalClose'),
      modalTitle: document.getElementById('modalTitle'),
      modalBg: document.getElementById('modalBg'),
      modalPoster: document.getElementById('modalPoster'),
      modalDesc: document.getElementById('modalDesc'),
      modalMeta: document.getElementById('modalMeta'),
      downloadArea: document.getElementById('downloadArea'),
      toast: document.getElementById('toast')
    };

    function showToast(msg, isError = false) {
      els.toast.textContent = msg;
      if(isError) els.toast.classList.add('error'); else els.toast.classList.remove('error');
      els.toast.classList.add('show');
      setTimeout(() => els.toast.classList.remove('show'), 3000);
    }

    async function loadMovies() {
      els.grid.innerHTML = '';
      els.loader.style.display = 'block';
      let url = \`/api/\${state.provider}?page=\${state.page}\`;
      if (state.query) {
        // hdhub4u, 4khdhub, and modlist have dedicated search endpoints
        if(state.provider === 'hdhub4u' || state.provider === '4khdhub' || state.provider.startsWith('modlist/')) {
          url = \`/api/\${state.provider}/search?q=\${encodeURIComponent(state.query)}&page=\${state.page}\`;
        } else {
          url = \`/api/\${state.provider}?s=\${encodeURIComponent(state.query)}&page=\${state.page}\`;
        }
      }
      
      try {
        const res = await fetch(url);
        const json = await res.json();
        
        let movies = [];
        if (state.provider === 'drive') movies = json.movies || [];
        else if (state.provider === 'hdhub4u') {
          // Home returns recentMovies; search returns results
          movies = json.data?.results || json.data?.recentMovies || [];
        }
        else if (state.provider === '4khdhub') movies = json.data?.results || json.data || [];
        else if (state.provider.startsWith('modlist/')) movies = json.movies || [];

        els.loader.style.display = 'none';
        
        if (!movies.length) {
          els.grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: var(--text-muted); padding: 4rem;">No movies found. Try another search.</div>';
          return;
        }

        els.pageBadge.textContent = "Page " + state.page;
        movies.forEach(item => {
          const img = item.imageUrl || item.image || '';
          const title = item.title || 'Unknown';
          const meta1 = item.quality || item.year || item.season || '';
          
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = \`
            <img src="\${img}" class="card-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'300\\'><rect fill=\\'%2327272a\\' width=\\'200\\' height=\\'300\\'/></svg>'">
            <div class="card-content">
              <div class="card-title">\${title}</div>
              \${meta1 ? \`<div class="card-meta"><span class="badge quality-badge">\${meta1}</span></div>\` : ''}
            </div>
          \`;
          div.onclick = () => openModal(item);
          els.grid.appendChild(div);
        });

        window.scrollTo({top: 0, behavior: 'smooth'});
      } catch (e) {
        els.loader.style.display = 'none';
        showToast('Error loading movies', true);
      }
    }

    // Modal Logic
    async function openModal(item) {
      els.modalOverlay.style.display = 'flex';
      els.modalTitle.textContent = item.title;
      els.modalPoster.src = item.imageUrl || '';
      els.modalBg.src = item.imageUrl || '';
      els.modalDesc.textContent = '';
      els.modalMeta.innerHTML = '';
      els.downloadArea.innerHTML = '<div class="loader"><i class="fas fa-circle-notch"></i> Extracting Direct Links...</div>';
      
      try {
        const res = await fetch(\`/api/\${state.provider}/details?url=\${encodeURIComponent(item.url)}\`);
        const json = await res.json();
        const data = json.data;
        
        if(data && data.synopsis) els.modalDesc.textContent = data.synopsis;
        if(data && data.storyline) els.modalDesc.textContent = data.storyline;
        if(data && data.description) els.modalDesc.textContent = data.description;
        
        let metaHtml = '';
        if(data.imdbRating) metaHtml += \`<span class="badge"><i class="fab fa-imdb" style="color:#f5c518"></i> \${data.imdbRating}</span>\`;
        if(data.language) metaHtml += \`<span class="badge">\${data.language}</span>\`;
        els.modalMeta.innerHTML = metaHtml;

        renderDownloadLinks(data, item.url);
      } catch (e) {
        els.downloadArea.innerHTML = '<div style="color:red">Error loading details.</div>';
      }
    }

    function renderDownloadLinks(data, movieUrl) {
      els.downloadArea.innerHTML = '';
      
      // HDHUB4U Format
      if(state.provider === 'hdhub4u') {
         if((!data.downloadLinks || !data.downloadLinks.length) && (!data.episodes || !data.episodes.length)) return els.downloadArea.innerHTML = 'No links found.';
         
         // Render standalone links (Movies)
         if(data.downloadLinks && data.downloadLinks.length) {
             let g = document.createElement('div'); g.className='download-group';
             g.innerHTML = \`<div class="dl-header">Downloads</div>\`;
             let wrapper = document.createElement('div'); wrapper.className='dl-links';
             data.downloadLinks.forEach(link => {
                let b = document.createElement('button'); b.className='dl-btn';
                b.innerHTML = \`<i class="fas fa-cloud-download-alt"></i> \${link.quality}\`;
                b.onclick = () => processDownload(link.url, b, movieUrl);
                wrapper.appendChild(b);
             });
             g.appendChild(wrapper);
             els.downloadArea.appendChild(g);
         }
         
         // Render episodes (TV Series)
         if(data.episodes && data.episodes.length) {
             data.episodes.forEach(ep => {
                 let g = document.createElement('div'); g.className='download-group';
                 g.innerHTML = \`<div class="dl-header">\${ep.episode}</div>\`;
                 let wrapper = document.createElement('div'); wrapper.className='dl-links';
                 ep.links.forEach(link => {
                    let b = document.createElement('button'); b.className='dl-btn';
                    b.innerHTML = \`<i class="fas fa-file-video"></i> \${link.quality || link.type || 'Download'}\`;
                    b.onclick = () => processDownload(link.url, b, movieUrl);
                    wrapper.appendChild(b);
                 });
                 g.appendChild(wrapper);
                 els.downloadArea.appendChild(g);
             });
         }
      }
      
      // 4KHDHUB Format
      else if(state.provider === '4khdhub') {
         if(!data.downloadLinks || !data.downloadLinks.length) return els.downloadArea.innerHTML = 'No links found.';
         data.downloadLinks.forEach(item => {
           let g = document.createElement('div'); g.className='download-group';
           g.innerHTML = \`<div class="dl-header"><span>\${item.title}</span><span class="badge">\${item.size}</span></div>\`;
           let wrapper = document.createElement('div'); wrapper.className='dl-links';
           item.links.forEach(l => {
             let b = document.createElement('button'); b.className='dl-btn';
             b.innerHTML = \`<i class="fas fa-server"></i> \${l.server}\`;
             b.onclick = () => processDownload(l.url, b, movieUrl);
             wrapper.appendChild(b);
           });
           g.appendChild(wrapper);
           els.downloadArea.appendChild(g);
         });
      }
      
      // MODLIST Format
      else if(state.provider.startsWith('modlist/')) {
         if(!data.downloadLinks || !data.downloadLinks.length) return els.downloadArea.innerHTML = 'No links found.';
         data.downloadLinks.forEach(item => {
           let g = document.createElement('div'); g.className='download-group';
           g.innerHTML = \`<div class="dl-header"><span>\${item.title}</span></div>\`;
           let wrapper = document.createElement('div'); wrapper.className='dl-links';
           item.links.forEach(l => {
             let b = document.createElement('button'); b.className='dl-btn';
             b.innerHTML = \`<i class="fas fa-server"></i> \${l.server}\`;
             b.onclick = () => processDownload(l.url, b, movieUrl);
             wrapper.appendChild(b);
           });
           g.appendChild(wrapper);
           els.downloadArea.appendChild(g);
         });
      }
      
      // DRIVE Format
      else if(state.provider === 'drive') {
         if(!data.downloadLinks) return els.downloadArea.innerHTML = 'No links found.';
         // Drive has "480p", "720p" objects
         for(let quality in data.downloadLinks) {
            let links = data.downloadLinks[quality];
            if(links && links.length > 0) {
               let g = document.createElement('div'); g.className='download-group';
               g.innerHTML = \`<div class="dl-header">\${quality} Direct Links</div>\`;
               let wrapper = document.createElement('div'); wrapper.className='dl-links';
               links.forEach(l => {
                 let b = document.createElement('button'); b.className='dl-btn';
                 b.innerHTML = \`<i class="fas fa-hdd"></i> \${l.title}\`;
                 b.onclick = () => processDriveDownload(l.url, b);
                 wrapper.appendChild(b);
               });
               g.appendChild(wrapper);
               els.downloadArea.appendChild(g);
            }
         }
      }
    }

    // ─── UNIFIED SMART DOWNLOAD SYSTEM ────────────────────────────────────
    
    // Direct CDN hosts – links from these can be opened/downloaded immediately
    const DIRECT_HOSTS = ['pixeldrain', 'gofile.io', 'dropapk', 'terabox', '1024tera',
                          'streamtape', 'mixdrop', 'upstream', 'doodstream', 'drive.google',
                          'mega.nz', '.mkv', '.mp4', '.avi', '.zip', '.rar'];
    
    // Hub-type links that need server-side extraction
    const HUB_HOSTS = ['hubcloud', 'hubdrive', 'vcloud', 'drivefly', 'hblinks', 'techy.youdontcare'];
    
    // Gadget/redirector links that need gadgetsweb extractor first
    const GADGET_HOSTS = ['gadgetsweb', 'cryptoinsights', 'cryptonewz', 'bonuscaf', 'gadgets'];
    
    // WP SafeLink shortener sites used by MoviesLeech/MoviesMod network
    const SAFELINK_HOSTS = ['unblockedgames.world', 'techy.in', 'tech2down'];
    
    // Series/Folders intermediate
    const MDRIVE_HOSTS = ['mdrive', 'drive', 'mdfiles', 'animeflix.dad', 'leechpro.blog', 'modpro.blog'];
    
    function detectLinkType(url) {
      if (HUB_HOSTS.some(h => url.includes(h))) return 'hub';
      if (GADGET_HOSTS.some(h => url.includes(h))) return 'gadget';
      if (SAFELINK_HOSTS.some(h => url.includes(h))) return 'safelink';
      if (MDRIVE_HOSTS.some(h => url.includes(h))) return 'mdrive';
      if (url.includes('gdflix') || url.includes('driveflix')) return 'gdflix';
      if (DIRECT_HOSTS.some(h => url.includes(h))) return 'direct';
      return 'unknown';
    }
    
    // Trigger actual file download in the browser
    function triggerFileDownload(fileUrl, filename) {
      // For cross-origin files, window.open is the only reliable way
      // (a.download attribute is blocked by browsers for cross-origin)
      window.open(fileUrl, '_blank');
    }
    
    // Extract from hubcloud/hubdrive server-side and trigger download
    async function extractAndDownloadHub(hubUrl, btnElement, referer) {
      btnElement.innerHTML = \`<i class="fas fa-spinner fa-spin"></i> Extracting...\`;
      showToast('Extracting direct link from HubCloud...');
      
      const res = await fetch(\`/api/extractors/hubcloud?url=\${encodeURIComponent(hubUrl)}\`);
      const data = await res.json();
      
      if (!data.success || !data.links || data.links.length === 0) {
        throw new Error(data.error || 'No links returned from HubCloud extractor');
      }
      
      // Pick best link: prefer FSL, instant, 10gbps, then fallback to first
      const best =
        data.links.find(l => l.link.includes('.mkv') || l.link.includes('.mp4')) ||
        data.links.find(l => l.name.toLowerCase().includes('fsl')) ||
        data.links.find(l => l.name.toLowerCase().includes('instant') || l.name.toLowerCase().includes('10gbps')) ||
        data.links[0];
      
      btnElement.classList.remove('resolving');
      btnElement.innerHTML = \`<i class="fas fa-check"></i> Download\`;
      btnElement.onclick = () => triggerFileDownload(best.link, data.filename);
      triggerFileDownload(best.link, data.filename);
      showToast('✅ Download started! Check your browser downloads.');
    }
    
    // Main unified download processor
    async function processDownload(url, btnElement, movieUrl) {
      btnElement.classList.add('resolving');
      btnElement.innerHTML = \`<i class="fas fa-spinner fa-spin"></i> Bypassing...\`;
      
      const type = detectLinkType(url);
      
      try {
        // ── 1. HubCloud / HubDrive ─────────────────────────────────────────
        if (type === 'hub') {
          await extractAndDownloadHub(url, btnElement, movieUrl);
          return;
        }
        
        // ── 2. GDFlix ─────────────────────────────────────────────────────
        if (type === 'gdflix') {
          btnElement.innerHTML = \`<i class="fas fa-spinner fa-spin"></i> Resolving GDFlix...\`;
          const res = await fetch(\`/api/extractors/gdflix?url=\${encodeURIComponent(url)}\`);
          const d = await res.json();
          if (d.success && d.links?.length > 0) {
            const finalUrl = d.links[0].link;
            btnElement.classList.remove('resolving');
            btnElement.innerHTML = \`<i class="fas fa-check"></i> Download\`;
            btnElement.onclick = () => { window.location.href = finalUrl; };
            window.location.href = finalUrl;
            showToast('✅ Download started!');
          } else {
            throw new Error('GDFlix failed');
          }
          return;
        }

        // ── 2b. MDrive / Episode Directory (leechpro, modpro, mdrive, animeflix) ──
        if (type === 'mdrive') {
          return processDriveDownload(url, btnElement);
        }

        
        // ── 3. WP SafeLink chain (leechpro/modpro/unblockedgames) ────────────
        if (type === 'safelink') {
          btnElement.innerHTML = \`<i class="fas fa-spinner fa-spin"></i> Bypassing...\`;
          showToast('Bypassing SafeLink shortener...');
          
          const sRes = await fetch(\`/api/extractors/safelink?url=\${encodeURIComponent(url)}&referer=\${encodeURIComponent(movieUrl || url)}\`);
          const sData = await sRes.json();
          
          if (!sData.success || !sData.resolvedUrl) {
            throw new Error(sData.error || 'SafeLink bypass failed');
          }
          
          const resolvedUrl = sData.resolvedUrl;
          const resolvedType = detectLinkType(resolvedUrl);
          
          if (resolvedType === 'hub') {
            await extractAndDownloadHub(resolvedUrl, btnElement, url);
          } else if (resolvedType === 'direct') {
            btnElement.classList.remove('resolving');
            btnElement.innerHTML = \`<i class="fas fa-check"></i> Download\`;
            btnElement.onclick = () => { window.location.href = resolvedUrl; };
            window.location.href = resolvedUrl;
            showToast('✅ Download started!');
          } else {
            // Potentially another intermediate step like mdrive or gdflix or unknown
            return processDownload(resolvedUrl, btnElement, movieUrl);
          }
          return;
        }
        
        // ── 4. Gadgetsweb / Cryptoinsights redirector chain ───────────────
        if (type === 'gadget') {
          btnElement.innerHTML = \`<i class="fas fa-spinner fa-spin"></i> Intercepting...\`;
          showToast('Bypassing redirector, please wait...');
          
          const apiUrl = \`/api/extractors/gadgetsweb?url=\${encodeURIComponent(url)}&referer=\${encodeURIComponent(movieUrl || url)}\`;
          const gRes = await fetch(apiUrl);
          const gData = await gRes.json();
          
          if (!gData.success || !gData.directLink) {
            throw new Error(gData.error || 'Gadgetsweb extraction failed');
          }
          
          const destUrl = gData.directLink;
          const destType = detectLinkType(destUrl);
          
          if (destType === 'hub') {
            await extractAndDownloadHub(destUrl, btnElement, url);
          } else if (destType === 'direct') {
            btnElement.classList.remove('resolving');
            btnElement.innerHTML = \`<i class="fas fa-check"></i> Download\`;
            btnElement.onclick = () => { window.location.href = destUrl; };
            window.location.href = destUrl;
            showToast('✅ Download started!');
          } else {
            // Pass it back through the pipeline
            return processDownload(destUrl, btnElement, movieUrl);
          }
          return;
        }
        
        // ── 4. Already a direct CDN/file link ─────────────────────────────
        if (type === 'direct') {
          btnElement.classList.remove('resolving');
          btnElement.innerHTML = \`<i class="fas fa-check"></i> Download\`;
          btnElement.onclick = () => { window.location.href = url; };
          window.location.href = url;
          showToast('✅ Download started!');
          return;
        }
        
        // ── 5. Unknown fallback – just open it ────────────────────────────
        btnElement.classList.remove('resolving');
        btnElement.innerHTML = \`<i class="fas fa-external-link-alt"></i> Open\`;
        btnElement.onclick = () => { window.location.href = url; };
        window.location.href = url;
        
      } catch(err) {
        console.error('Download failed:', err);
        btnElement.classList.remove('resolving');
        btnElement.innerHTML = \`<i class="fas fa-exclamation-triangle"></i> Retry\`;
        btnElement.onclick = () => processDownload(url, btnElement, movieUrl);
        showToast('⚠️ Failed to resolve. Click to retry.', true);
      }
    }
    
    // Drive gives intermediate pages -> mdrive -> hubcloud. 2-Step.
    async function processDriveDownload(intermediateUrl, btnElement) {
       btnElement.classList.add('resolving');
       btnElement.innerHTML = \`<i class="fas fa-spinner fa-spin"></i> Resolving...\`;
       
       try {
           let endpoint = '/api/drive/mdrive';
           if (intermediateUrl.includes('animeflix.dad') || intermediateUrl.includes('leechpro.blog') || intermediateUrl.includes('modpro.blog')) {
               endpoint = '/api/drive/animeflix';
           }
           const res = await fetch(\`\${endpoint}?url=\${encodeURIComponent(intermediateUrl)}\`);
           const data = await res.json();
           
           if(data.episodes && data.episodes.length > 0) {
               if (data.episodes.length === 1) {
                   return processDownload(data.episodes[0].hubCloudUrl, btnElement, intermediateUrl);
               } else {
                   // Multiple episodes found (Series)
                   btnElement.style.display = 'none';
                   data.episodes.forEach(ep => {
                       const epBtn = document.createElement('button');
                       epBtn.className = 'download-btn';
                       epBtn.innerHTML = \`<i class="fas fa-file-video"></i> \${ep.episode} \${ep.size ? \`[\${ep.size}]\` : ''}\`;
                       epBtn.onclick = () => processDownload(ep.hubCloudUrl, epBtn, intermediateUrl);
                       btnElement.parentNode.appendChild(epBtn);
                   });
                   showToast('✅ Extracted ' + data.episodes.length + ' episodes!');
               }
           } else {
               throw new Error('No episodes found in directory response');
           }
       } catch (e) {
           console.error('Drive download failed:', e);
           btnElement.classList.remove('resolving');
           btnElement.innerHTML = \`<i class="fas fa-exclamation-triangle"></i> Retry\`;
           btnElement.onclick = () => processDriveDownload(intermediateUrl, btnElement);
           showToast('⚠️ Failed. Click to retry.', true);
       }
    }

    // Event Listeners
    els.providerSelect.onchange = (e) => {
      state.provider = e.target.value;
      state.page = 1;
      loadMovies();
    };

    els.searchForm.onsubmit = (e) => {
      e.preventDefault();
      state.query = els.searchInput.value.trim();
      state.page = 1;
      loadMovies();
    };

    els.prevBtn.onclick = () => { if(state.page > 1) { state.page--; loadMovies(); } };
    els.nextBtn.onclick = () => { state.page++; loadMovies(); };

    els.modalClose.onclick = () => els.modalOverlay.style.display = 'none';
    els.modalOverlay.onclick = (e) => { if(e.target === els.modalOverlay) els.modalOverlay.style.display = 'none'; };

    // Init
    loadMovies();
  </script>
</body>
</html>`;
}
