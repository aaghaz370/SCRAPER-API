export function getAnimeSaltUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AnimeSalt — Watch Anime & Cartoons</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    :root {
      --primary: #8B5CF6;
      --primary-dark: #6D28D9;
      --primary-glow: rgba(139,92,246,0.35);
      --accent: #F59E0B;
      --bg: #0C0D12;
      --bg2: #13141B;
      --bg3: #1A1B26;
      --bg4: #22243A;
      --border: rgba(255,255,255,0.07);
      --text: #E2E8F0;
      --text-muted: #64748B;
      --red: #EF4444;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:var(--bg);}
    ::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:99px;}
    ::-webkit-scrollbar-thumb:hover{background:var(--primary);}

    /* ── Navbar ── */
    nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(12,13,18,0.88);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);height:64px;display:flex;align-items:center;padding:0 24px;gap:16px;}
    .nav-logo{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:800;color:#fff;text-decoration:none;white-space:nowrap;letter-spacing:-0.5px;}
    .nav-logo .logo-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#3B82F6);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;box-shadow:0 0 16px var(--primary-glow);}
    .nav-logo span{color:var(--primary);}
    .search-wrap{flex:1;max-width:520px;margin:0 auto;position:relative;}
    .search-wrap input{width:100%;height:40px;border-radius:99px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:14px;padding:0 40px 0 42px;outline:none;transition:all .25s;}
    .search-wrap input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-glow);background:var(--bg2);}
    .search-wrap .s-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;pointer-events:none;}
    .search-wrap .clear-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;cursor:pointer;display:none;background:none;border:none;padding:4px;transition:color .2s;}
    .search-wrap .clear-btn:hover{color:var(--red);}
    .nav-api-link{font-size:12px;color:var(--text-muted);white-space:nowrap;text-decoration:none;padding:6px 12px;border-radius:8px;border:1px solid var(--border);transition:all .2s;}
    .nav-api-link:hover{color:var(--primary);border-color:var(--primary);}

    /* ── Main ── */
    main{padding:88px 24px 48px;max-width:1400px;margin:0 auto;}

    /* ── Hero ── */
    .hero{text-align:center;padding:32px 0 40px;background:radial-gradient(ellipse 70% 60% at 50% 0%,rgba(139,92,246,.12),transparent);border-radius:24px;margin-bottom:36px;}
    .hero h1{font-size:clamp(28px,5vw,52px);font-weight:800;letter-spacing:-1px;background:linear-gradient(135deg,#fff 30%,var(--primary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.1;margin-bottom:12px;}
    .hero p{color:var(--text-muted);font-size:15px;max-width:480px;margin:0 auto 24px;}
    .filter-bar{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
    .filter-btn{padding:7px 18px;border-radius:99px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text-muted);transition:all .2s;white-space:nowrap;}
    .filter-btn.active,.filter-btn:hover{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 4px 12px var(--primary-glow);}

    /* ── Section Header ── */
    .section-header{display:flex;align-items:center;margin-bottom:20px;}
    .section-header h2{font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px;}
    .dot{width:8px;height:8px;border-radius:99px;background:var(--primary);box-shadow:0 0 6px var(--primary);display:inline-block;animation:pulse 2s infinite;}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

    /* ── Grid ── */
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px;}
    @media(min-width:640px){.grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));}}

    /* ── Card ── */
    .card{border-radius:14px;overflow:hidden;cursor:pointer;background:var(--bg2);border:1px solid var(--border);transition:all .3s cubic-bezier(.4,0,.2,1);animation:fadeUp .4s ease both;display:flex;flex-direction:column;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    .card:hover{transform:translateY(-8px) scale(1.02);border-color:rgba(139,92,246,.4);box-shadow:0 16px 40px rgba(0,0,0,.5),0 0 20px rgba(139,92,246,.12);}
    .card-img-wrap{position:relative;aspect-ratio:2/3;overflow:hidden;}
    .card-img-wrap img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
    .card:hover .card-img-wrap img{transform:scale(1.07);}
    .card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 60%);opacity:0;transition:opacity .3s;display:flex;align-items:center;justify-content:center;}
    .card:hover .card-overlay{opacity:1;}
    .play-circle{width:52px;height:52px;border-radius:50%;background:rgba(139,92,246,.85);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;box-shadow:0 0 20px rgba(139,92,246,.6);transform:scale(.8);transition:transform .3s;}
    .card:hover .play-circle{transform:scale(1);}
    .type-badge{position:absolute;top:8px;left:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:3px 8px;border-radius:6px;background:rgba(139,92,246,.85);color:#fff;}
    .type-badge.movie{background:rgba(245,158,11,.85);}
    .card-info{padding:10px 12px 12px;}
    .card-title{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .card-sub{font-size:11px;color:var(--text-muted);margin-top:3px;}

    /* ── Loaders ── */
    .loader-wrap{grid-column:1/-1;padding:60px;text-align:center;}
    .spinner{width:44px;height:44px;border-radius:50%;margin:0 auto 16px;border:3px solid var(--bg4);border-top-color:var(--primary);animation:spin .8s linear infinite;}
    .spinner.sm{width:24px;height:24px;margin:0;border-width:2px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loader-wrap p{color:var(--text-muted);font-size:14px;}
    .empty-state{grid-column:1/-1;padding:60px;text-align:center;color:var(--text-muted);}
    .empty-state i{font-size:40px;margin-bottom:12px;display:block;opacity:.3;}

    /* ── Details Modal ── */
    .modal-bg{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);overflow-y:auto;padding:20px;}
    .modal-bg.show{display:flex;align-items:flex-start;justify-content:center;padding-top:40px;}
    .modal-box{background:var(--bg2);border-radius:20px;width:100%;max-width:760px;border:1px solid var(--border);overflow:hidden;animation:modalIn .3s cubic-bezier(.4,0,.2,1);margin-bottom:40px;}
    @keyframes modalIn{from{opacity:0;transform:scale(.93) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .modal-cover{position:relative;height:260px;overflow:hidden;}
    .modal-cover img{width:100%;height:100%;object-fit:cover;object-position:center 20%;filter:brightness(.7);}
    .modal-cover-grad{position:absolute;inset:0;background:linear-gradient(to top,var(--bg2) 0%,transparent 70%);}
    .modal-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid var(--border);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;}
    .modal-close:hover{background:var(--red);border-color:var(--red);}
    .modal-body{padding:0 24px 28px;}
    .modal-title{font-size:clamp(22px,3vw,30px);font-weight:800;margin-bottom:10px;letter-spacing:-.5px;}
    .badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
    .badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text-muted);}
    .badge.purple{background:rgba(139,92,246,.15);border-color:rgba(139,92,246,.4);color:#A78BFA;}
    .badge.amber{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.4);color:#FCD34D;}
    .modal-synopsis{font-size:14px;color:var(--text-muted);line-height:1.7;margin-bottom:16px;max-height:80px;overflow:hidden;}
    .modal-synopsis.expanded{max-height:none;}
    .read-more{color:var(--primary);font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;padding:0;font-family:inherit;display:block;margin-bottom:18px;}
    .season-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
    .season-tab{padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text-muted);transition:all .2s;font-family:inherit;}
    .season-tab.active,.season-tab:hover{background:var(--primary);border-color:var(--primary);color:#fff;}
    .ep-grid{display:grid;gap:8px;max-height:320px;overflow-y:auto;padding-right:4px;margin-bottom:20px;}
    .ep-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;background:var(--bg3);border:1px solid var(--border);cursor:pointer;transition:all .2s;}
    .ep-item:hover{background:var(--bg4);border-color:rgba(139,92,246,.4);}
    .ep-thumb{width:72px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0;background:var(--bg4);}
    .ep-num{font-size:11px;font-weight:700;color:var(--primary);min-width:32px;}
    .ep-title{font-size:13px;font-weight:500;flex:1;}
    .ep-play{color:var(--text-muted);font-size:13px;transition:color .2s;}
    .ep-item:hover .ep-play{color:var(--primary);}

    /* ── Player ── */
    #player-modal{display:none;position:fixed;inset:0;z-index:300;background:#000;flex-direction:column;align-items:center;justify-content:center;}
    #player-modal.show{display:flex;}
    .player-topbar{position:absolute;top:0;left:0;right:0;padding:14px 20px;display:flex;align-items:center;gap:12px;background:linear-gradient(to bottom,rgba(0,0,0,.9),transparent);z-index:10;}
    .player-close{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;font-family:inherit;}
    .player-close:hover{background:var(--red);}
    .player-ep-title{font-size:14px;font-weight:600;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
    /* Video wrapper */
    .player-video-wrap{width:95%;max-width:1280px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;position:relative;background:#000;box-shadow:0 0 60px rgba(0,0,0,.9);}
    #main-video{width:100%;height:100%;display:block;outline:none;background:#000;}
    .video-overlay-loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);z-index:5;}
    .video-overlay-loader.hidden{display:none;}

    /* Controls bar */
    .player-controls{width:95%;max-width:1280px;margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
    .ctrl-grp{display:flex;align-items:center;gap:8px;}
    .ctrl-lbl{font-size:12px;color:var(--text-muted);font-weight:600;display:flex;align-items:center;gap:5px;white-space:nowrap;}
    .ctrl-sel{background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-family:inherit;font-size:13px;outline:none;cursor:pointer;transition:border-color .2s;max-width:160px;}
    .ctrl-sel:focus{border-color:var(--primary);}
    .ctrl-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;background:var(--bg3);color:var(--text-muted);border:1px solid var(--border);cursor:pointer;transition:all .2s;text-decoration:none;display:flex;align-items:center;gap:6px;white-space:nowrap;}
    .ctrl-btn:hover{border-color:var(--primary);color:var(--primary);}
    .ctrl-btn.ml-auto{margin-left:auto;}
    .err-banner{color:var(--red);font-size:13px;padding:8px 12px;background:rgba(239,68,68,.1);border-radius:8px;border:1px solid rgba(239,68,68,.2);display:flex;align-items:center;gap:8px;}
  </style>
</head>
<body>

  <!-- Navbar -->
  <nav>
    <a class="nav-logo" href="#">
      <div class="logo-icon"><i class="fas fa-play-circle"></i></div>
      Anime<span>Salt</span>
    </a>
    <div class="search-wrap">
      <i class="fas fa-search s-icon"></i>
      <input id="searchInput" type="search" placeholder="Search anime, cartoons, movies…" autocomplete="off" />
      <button class="clear-btn" id="clearBtn" title="Clear"><i class="fas fa-times"></i></button>
    </div>
    <a class="nav-api-link" href="/api/animesalt?action=home" target="_blank"><i class="fas fa-code"></i> API</a>
  </nav>

  <!-- Main -->
  <main>
    <div class="hero" id="heroSection">
      <h1>Watch Anime & Cartoons<br/>in Your Language</h1>
      <p>Hindi · Tamil · Telugu · English · Japanese — All in one place.</p>
      <div class="filter-bar">
        <button class="filter-btn active" id="btn-all" onclick="setFilter('all')"><i class="fas fa-fire"></i> All</button>
        <button class="filter-btn" id="btn-series" onclick="setFilter('series')"><i class="fas fa-tv"></i> Series</button>
        <button class="filter-btn" id="btn-movies" onclick="setFilter('movies')"><i class="fas fa-film"></i> Movies</button>
      </div>
    </div>
    <div class="section-header">
      <h2 id="sectionTitle"><span class="dot"></span> Popular Now</h2>
    </div>
    <div class="grid" id="resultsGrid">
      <div class="loader-wrap"><div class="spinner"></div><p>Loading popular anime…</p></div>
    </div>
  </main>

  <!-- Details Modal -->
  <div class="modal-bg" id="detailsModal">
    <div class="modal-box">
      <div class="modal-cover" id="modalCover">
        <img id="modalCoverImg" src="" alt="" />
        <div class="modal-cover-grad"></div>
        <button class="modal-close" onclick="closeDetails()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div style="margin-top:-24px;position:relative;z-index:2;">
          <h2 class="modal-title" id="modalTitle">Loading…</h2>
          <div class="badges" id="modalBadges"></div>
          <p class="modal-synopsis" id="modalSynopsis"></p>
          <button class="read-more" id="readMoreBtn" onclick="toggleSynopsis()" style="display:none;">Read more…</button>
        </div>
        <div id="seasonArea"></div>
        <div id="episodeArea"><div style="padding:30px;text-align:center;"><div class="spinner" style="margin:0 auto;"></div></div></div>
        <div id="movieWatchArea" style="display:none;"></div>
      </div>
    </div>
  </div>

  <!-- Player Modal -->
  <div id="player-modal">
    <div class="player-topbar">
      <button class="player-close" onclick="closePlayer()"><i class="fas fa-chevron-left"></i></button>
      <div class="player-ep-title" id="playerTitle"></div>
    </div>
    <div class="player-video-wrap">
      <div class="video-overlay-loader" id="vidLoader"><div class="spinner" style="width:50px;height:50px;border-width:4px;margin:0;"></div></div>
      <video id="main-video" controls playsinline crossorigin="anonymous"></video>
    </div>
    <div class="player-controls" id="playerControls"></div>
  </div>

<script>
  const API = '/api/animesalt';
  let homeData = { popularSeries:[], popularMovies:[] };
  let currentFilter = 'all';
  let detailData = null;
  let currentSeasonIdx = 0;
  let hlsInstance = null;
  let currentEpUrl = '';

  // ── Init ──
  window.onload = () => {
    fetchHome();
    const inp = document.getElementById('searchInput');
    const clr = document.getElementById('clearBtn');
    inp.addEventListener('input', () => { clr.style.display = inp.value ? 'block' : 'none'; });
    inp.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(inp.value.trim()); });
    clr.addEventListener('click', () => { inp.value=''; clr.style.display='none'; fetchHome(); });
  };

  // ── Home ──
  async function fetchHome() {
    document.getElementById('heroSection').style.display='';
    document.getElementById('sectionTitle').innerHTML='<span class="dot"></span> Popular Now';
    showGridLoader();
    try {
      const r = await fetch(API+'?action=home');
      const j = await r.json();
      if(j.success){ homeData=j.data; renderFilter(currentFilter); }
      else showEmpty('Could not load anime.');
    } catch(e){ showEmpty('Error: '+e.message); }
  }

  function setFilter(f){
    currentFilter=f;
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    const b=document.getElementById('btn-'+f); if(b) b.classList.add('active');
    renderFilter(f);
  }
  function renderFilter(f){
    let items=[];
    if(f==='series') items=homeData.popularSeries||[];
    else if(f==='movies') items=homeData.popularMovies||[];
    else items=[...(homeData.popularSeries||[]),...(homeData.popularMovies||[])];
    renderGrid(items);
  }

  // ── Search ──
  async function doSearch(q){
    if(!q){fetchHome();return;}
    document.getElementById('heroSection').style.display='none';
    document.getElementById('sectionTitle').innerHTML='<span class="dot"></span> Results for "'+escHtml(q)+'"';
    showGridLoader();
    try{
      const r=await fetch(API+'?action=search&q='+encodeURIComponent(q));
      const j=await r.json();
      if(j.success && j.data.length) renderGrid(j.data);
      else showEmpty('No results for "'+escHtml(q)+'"');
    }catch(e){showEmpty('Error: '+e.message);}
  }

  // ── Grid ──
  function renderGrid(items){
    const grid=document.getElementById('resultsGrid');
    if(!items||!items.length){showEmpty('No items found.');return;}
    grid.innerHTML='';
    items.forEach((item,i)=>{
      const div=document.createElement('div');
      div.className='card'; div.style.animationDelay=(i*25)+'ms';
      const isMovie=item.type==='movie'||((item.url||'').includes('/movie'));
      const img=(item.image&&item.image.startsWith('http'))?item.image
        :'https://placehold.co/300x450/1A1B26/8B5CF6?text='+encodeURIComponent((item.title||'').slice(0,10));
      div.innerHTML=\`
        <div class="card-img-wrap">
          <img src="\${img}" alt="\${escHtml(item.title||'')}" loading="lazy"
               onerror="this.src='https://placehold.co/300x450/1A1B26/8B5CF6?text=No+Image'"/>
          <div class="card-overlay"><div class="play-circle"><i class="fas fa-play" style="margin-left:3px;"></i></div></div>
          <div class="type-badge \${isMovie?'movie':''}  ">\${isMovie?'Movie':'Anime'}</div>
        </div>
        <div class="card-info">
          <div class="card-title" title="\${escHtml(item.title||'')}">\${escHtml(item.title||'Unknown')}</div>
          <div class="card-sub">\${isMovie?'🎬 Movie':'📺 Series'}</div>
        </div>
      \`;
      div.onclick=()=>openDetails(item);
      grid.appendChild(div);
    });
  }

  // ── Details Modal ──
  async function openDetails(item){
    detailData=null; currentSeasonIdx=0;
    document.getElementById('detailsModal').classList.add('show');
    document.body.style.overflow='hidden';
    document.getElementById('modalTitle').textContent=item.title||'…';
    document.getElementById('modalBadges').innerHTML='';
    document.getElementById('modalSynopsis').textContent='';
    document.getElementById('readMoreBtn').style.display='none';
    document.getElementById('modalSynopsis').classList.remove('expanded');
    document.getElementById('seasonArea').innerHTML='';
    document.getElementById('movieWatchArea').style.display='none';
    document.getElementById('movieWatchArea').innerHTML='';
    document.getElementById('episodeArea').innerHTML='<div style="padding:30px;text-align:center;"><div class="spinner" style="margin:0 auto;"></div></div>';
    const ci=document.getElementById('modalCoverImg');
    ci.src=(item.image&&item.image.startsWith('http'))?item.image:'';
    try{
      const r=await fetch(API+'?action=details&url='+encodeURIComponent(item.url));
      const j=await r.json();
      if(!j.success) throw new Error(j.error||'Failed to load');
      detailData=j.data;
      renderDetails(item);
    }catch(e){
      document.getElementById('episodeArea').innerHTML=
        '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>'+escHtml(e.message)+'</p></div>';
    }
  }

  function renderDetails(item){
    const d=detailData;
    const img=(d.image&&d.image.startsWith('http'))?d.image:(item.image&&item.image.startsWith('http'))?item.image:'';
    document.getElementById('modalCoverImg').src=img;
    document.getElementById('modalTitle').textContent=d.title||item.title;

    let badges='';
    if(d.rating) badges+=\`<span class="badge amber"><i class="fas fa-star"></i> \${escHtml(d.rating)}</span>\`;
    if(d.isMovie) badges+='<span class="badge purple">Movie</span>';
    else badges+=\`<span class="badge purple">\${(d.seasons||[]).length} Season(s)</span>\`;
    if((d.langs||[]).length) badges+=\`<span class="badge"><i class="fas fa-microphone"></i> \${d.langs.slice(0,4).join(' · ')}</span>\`;
    if((d.qualities||[]).length) badges+=\`<span class="badge">\${d.qualities.join(' / ')}</span>\`;
    document.getElementById('modalBadges').innerHTML=badges;

    const syn=document.getElementById('modalSynopsis');
    const rm=document.getElementById('readMoreBtn');
    syn.textContent=d.synopsis||'No description available.';
    rm.style.display=(d.synopsis&&d.synopsis.length>160)?'block':'none';

    if(d.isMovie){
      document.getElementById('episodeArea').innerHTML='';
      const ma=document.getElementById('movieWatchArea');
      ma.style.display='block';
      ma.innerHTML=\`
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
          <button onclick="playEpisode('\${encodeURIComponent(item.url)}','\${escAttr(d.title||item.title)}')"
            style="padding:12px 28px;border-radius:99px;background:var(--primary);color:#fff;border:none;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-play"></i> Watch Now
          </button>
          <a href="\${escAttr(item.url)}" target="_blank"
            style="padding:12px 22px;border-radius:99px;background:var(--bg3);color:var(--text-muted);border:1px solid var(--border);font-family:inherit;font-size:14px;font-weight:600;text-decoration:none;display:flex;align-items:center;gap:6px;">
            <i class="fas fa-external-link-alt"></i> Open Site
          </a>
        </div>
      \`;
    } else {
      renderSeasons(item);
    }
  }

  function renderSeasons(item){
    const seasons=(detailData&&detailData.seasons)||[];
    if(!seasons.length){
      document.getElementById('episodeArea').innerHTML='<div class="empty-state"><i class="fas fa-inbox"></i><p>No episodes found.</p></div>';
      return;
    }
    let tabs='';
    seasons.forEach((s,i)=>{
      tabs+=\`<button class="season-tab \${i===0?'active':''}" id="stab-\${i}" onclick="switchSeason(\${i})">\${escHtml(s.seasonName||'Season '+(i+1))}</button>\`;
    });
    document.getElementById('seasonArea').innerHTML='<div class="season-tabs">'+tabs+'</div>';
    renderEpisodes(0);
  }

  function switchSeason(idx){
    currentSeasonIdx=idx;
    document.querySelectorAll('.season-tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
    renderEpisodes(idx);
  }

  function renderEpisodes(idx){
    const seasons=(detailData&&detailData.seasons)||[];
    const season=seasons[idx];
    if(!season){document.getElementById('episodeArea').innerHTML='';return;}
    const eps=season.episodes||[];
    if(!eps.length){
      document.getElementById('episodeArea').innerHTML='<div class="empty-state"><i class="fas fa-inbox"></i><p>No episodes in this season.</p></div>';
      return;
    }
    let html='<div class="ep-grid">';
    eps.forEach((ep,i)=>{
      const num=ep.epNumRaw||(idx+1)+'x'+(i+1);
      const title=ep.title||('Episode '+(i+1));
      const img=ep.image&&ep.image.startsWith('http')?ep.image:'';
      html+=\`<div class="ep-item" onclick="playEpisode('\${encodeURIComponent(ep.url)}','\${escAttr(title)}')">
        \${img?\`<img class="ep-thumb" src="\${img}" alt="" onerror="this.style.display='none'"/>\`:''}
        <div class="ep-num">\${escHtml(num)}</div>
        <div class="ep-title">\${escHtml(title)}</div>
        <i class="fas fa-play ep-play"></i>
      </div>\`;
    });
    html+='</div>';
    document.getElementById('episodeArea').innerHTML=html;
  }

  function toggleSynopsis(){
    const s=document.getElementById('modalSynopsis');
    const b=document.getElementById('readMoreBtn');
    s.classList.toggle('expanded');
    b.textContent=s.classList.contains('expanded')?'Show less':'Read more…';
  }
  function closeDetails(){document.getElementById('detailsModal').classList.remove('show');document.body.style.overflow='';}

  // ── Player ──
  async function playEpisode(encodedUrl, title){
    currentEpUrl=decodeURIComponent(encodedUrl);
    closeDetails();

    document.getElementById('player-modal').classList.add('show');
    document.getElementById('playerTitle').textContent=title||'';
    document.getElementById('vidLoader').classList.remove('hidden');
    document.getElementById('playerControls').innerHTML='<div class="ctrl-grp"><div class="spinner sm"></div><span style="font-size:13px;color:var(--text-muted);margin-left:8px;">Extracting stream…</span></div>';

    const video=document.getElementById('main-video');
    if(hlsInstance){hlsInstance.destroy();hlsInstance=null;}
    video.src='';

    try{
      const r=await fetch(API+'?action=stream&url='+encodeURIComponent(currentEpUrl));
      const j=await r.json();

      if(!j.success||!j.data||!j.data.masterM3u8){
        throw new Error(j.message||j.error||'No stream found');
      }

      // proxiedM3u8 goes through our server (fixes CORS). masterM3u8 is the raw CDN link.
      const m3u8ToLoad = j.data.proxiedM3u8 || j.data.masterM3u8;
      const rawLink    = j.data.masterM3u8;
      loadHLSStream(m3u8ToLoad, rawLink, title, currentEpUrl, j.data.tracks||[]);

    }catch(e){
      document.getElementById('vidLoader').classList.add('hidden');
      document.getElementById('playerControls').innerHTML=
        '<div class="err-banner"><i class="fas fa-exclamation-triangle"></i> '+escHtml(e.message)+'</div>';
    }
  }

  // m3u8Url = proxied URL for HLS.js; rawLink = direct CDN link for the button
  function loadHLSStream(m3u8Url, rawLink, title, episodeUrl, subtitleTracks){
    const video=document.getElementById('main-video');

    // Add subtitle tracks
    // (WebVTT tracks injected after manifest load)
    function buildControls(levels, audioTracks){
      let html='';

      // Quality
      html+='<div class="ctrl-grp"><div class="ctrl-lbl"><i class="fas fa-film"></i> Quality</div>';
      html+='<select class="ctrl-sel" id="qualSel" onchange="switchQuality(this.value)">';
      html+='<option value="-1">🔄 Auto</option>';
      levels.forEach((lvl,i)=>{
        const h=lvl.height||0;
        const icon=h>=1080?'🔵':h>=720?'🟢':'🟡';
        html+=\`<option value="\${i}">\${icon} \${h?h+'p':'Level '+(i+1)}</option>\`;
      });
      html+='</select></div>';

      // Audio / Language
      if(audioTracks&&audioTracks.length>0){
        html+='<div class="ctrl-grp"><div class="ctrl-lbl"><i class="fas fa-language"></i> Language</div>';
        html+='<select class="ctrl-sel" id="audioSel" onchange="switchAudio(this.value)">';
        audioTracks.forEach((t,i)=>{
          html+=\`<option value="\${i}">\${escHtml(t.name||t.lang||'Track '+(i+1))}</option>\`;
        });
        html+='</select></div>';
      }

      // Links — raw CDN link + episode page
      html+=\`<a class="ctrl-btn" href="\${escAttr(rawLink)}" target="_blank" style="margin-left:auto;">
        <i class="fas fa-link"></i> Stream Link
      </a>\`;
      html+=\`<a class="ctrl-btn" href="\${escAttr(episodeUrl)}" target="_blank">
        <i class="fas fa-globe"></i> Episode Page
      </a>\`;

      document.getElementById('playerControls').innerHTML=html;
    }

    if(Hls.isSupported()){
      hlsInstance=new Hls({
        enableWorker:true,
        maxBufferLength:30,
        fragLoadingMaxRetry:5,
        manifestLoadingMaxRetry:4,
        startLevel:-1,
        capLevelToPlayerSize:true,
      });

      hlsInstance.loadSource(m3u8Url);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (e,data)=>{
        document.getElementById('vidLoader').classList.add('hidden');
        const levels=hlsInstance.levels||[];
        const audio=hlsInstance.audioTracks||[];
        buildControls(levels, audio);
        video.play().catch(()=>{});
      });

      hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, (e,data)=>{
        const audio=hlsInstance.audioTracks||[];
        if(!audio.length) return;
        const sel=document.getElementById('audioSel');
        if(!sel) {
           // Rebuild controls if audio tracks loaded late
           const levels=hlsInstance.levels||[];
           buildControls(levels, audio);
        }
        
        // Try to auto-select Hindi
        const hinIdx=audio.findIndex(t=>(t.name||'').toLowerCase().includes('hindi')||(t.lang||'').toLowerCase()==='hin');
        const defIdx=hinIdx>=0?hinIdx:0;
        hlsInstance.audioTrack=defIdx;
        
        const newSel=document.getElementById('audioSel');
        if(newSel) newSel.value=defIdx;
      });

      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (e,data)=>{
        const sel=document.getElementById('qualSel');
        if(sel&&sel.value!=='-1') sel.value=data.level;
      });

      hlsInstance.on(Hls.Events.ERROR, (e,data)=>{
        if(data.fatal){
          if(data.type===Hls.ErrorTypes.NETWORK_ERROR) hlsInstance.startLoad();
          else if(data.type===Hls.ErrorTypes.MEDIA_ERROR) hlsInstance.recoverMediaError();
        }
      });

    } else if(video.canPlayType('application/vnd.apple.mpegurl')){
      // Safari native HLS
      video.src=m3u8Url;
      document.getElementById('vidLoader').classList.add('hidden');
      buildControls([],[]);
      video.play().catch(()=>{});
    } else {
      document.getElementById('vidLoader').classList.add('hidden');
      document.getElementById('playerControls').innerHTML=
        '<div class="err-banner"><i class="fas fa-exclamation-triangle"></i> HLS not supported in this browser.</div>';
    }
  }

  window.switchQuality=function(val){
    if(!hlsInstance) return;
    const idx=parseInt(val);
    hlsInstance.currentLevel=idx;
    hlsInstance.nextLevel=idx;
  };
  window.switchAudio=function(val){
    if(!hlsInstance) return;
    hlsInstance.audioTrack=parseInt(val);
  };

  function closePlayer(){
    document.getElementById('player-modal').classList.remove('show');
    const video=document.getElementById('main-video');
    if(hlsInstance){hlsInstance.destroy();hlsInstance=null;}
    video.src='';
  }

  // ── Helpers ──
  function showGridLoader(){
    document.getElementById('resultsGrid').innerHTML='<div class="loader-wrap"><div class="spinner"></div><p>Loading…</p></div>';
  }
  function showEmpty(msg){
    document.getElementById('resultsGrid').innerHTML='<div class="empty-state"><i class="fas fa-search"></i><p>'+escHtml(msg)+'</p></div>';
  }
  function escHtml(str){
    if(!str)return'';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str){
    if(!str)return'';
    return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  document.getElementById('detailsModal').addEventListener('click',function(e){if(e.target===this)closeDetails();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(document.getElementById('player-modal').classList.contains('show')){closePlayer();return;}
      if(document.getElementById('detailsModal').classList.contains('show')){closeDetails();}
    }
  });
</script>
</body>
</html>`;
}
