import { writeFileSync } from 'node:fs';

export interface BuiltEmail {
  name: string;
  kb: string;
  category: string;
}

/**
 * Emit dist/index.html — the preview gallery. A real web page (not an email), so it gets the full
 * treatment the templates can't have: a proper light/dark theme (system default + a persisted manual
 * toggle), a design-token scale, a device-framed preview with a desktop/mobile switch, hash-routing
 * (#<name>, directly linkable), keyboard nav (↑/↓), and one-click copy of the raw or minified HTML
 * with a success state.
 */
export interface KeyInfo {
  key: string;
  description: string;
}

export function writeGallery(
  outDir: string,
  built: BuiltEmail[],
  builtAt: string,
  keysByEmail: Record<string, KeyInfo[]>,
  minByEmail: Record<string, string>,
): void {
  const cards = built
    .map(
      (e, i) =>
        `<button class="card${i === 0 ? ' active' : ''}" data-name="${e.name}" role="option" aria-selected="${i === 0}">
            <span class="card-top"><span class="card-name">${e.name}</span><span class="chip chip-${e.category}">${e.category}</span></span>
            <span class="card-kb">${e.kb} KB</span>
          </button>`,
    )
    .join('\n          ');

  const data = JSON.stringify(
    Object.fromEntries(built.map((e) => [e.name, { kb: e.kb, category: e.category }])),
  );
  const names = JSON.stringify(built.map((e) => e.name));
  const keys = JSON.stringify(keysByEmail);
  // Ship the minified HTML base64-encoded so the gallery can read/customize/copy it with no fetch
  // (works identically from file:// locally and from GitHub Pages — no CORS).
  const minB64 = JSON.stringify(
    Object.fromEntries(
      Object.entries(minByEmail).map(([name, html]) => [
        name,
        Buffer.from(html).toString('base64'),
      ]),
    ),
  );
  const first = built[0]?.name ?? '';

  writeFileSync(
    `${outDir}/index.html`,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COMACPRO — Email templates</title>
<style>
  :root{
    --brand:#e5641f; --brand-ink:#fff;
    --bg:#f5f6f8; --panel:#ffffff; --panel-2:#fbfbfc; --stage:#eceef1;
    --ink:#12263a; --muted:#64748b; --border:#e6e9ee; --border-strong:#d3d8e0;
    --brand-soft:rgba(229,100,31,.10); --ok:#1a9d5a;
    --shadow-sm:0 1px 2px rgba(16,32,58,.06),0 1px 3px rgba(16,32,58,.05);
    --shadow-lg:0 12px 34px rgba(16,32,58,.14);
    --r-lg:16px; --r-md:12px; --r-sm:9px; --r-pill:999px;
    --sp:8px; --ease:cubic-bezier(.2,.7,.3,1);
    color-scheme:light;
  }
  /* Dark palette applies when the OS prefers dark (unless the user forced light via the toggle),
     and always when the toggle set data-theme=dark. Same declarations, two triggers. */
  @media (prefers-color-scheme:dark){ :root:not([data-theme=light]){
    --bg:#0d0f12; --panel:#16191f; --panel-2:#1b1f26; --stage:#0a0c0f;
    --ink:#eef2f7; --muted:#8b95a4; --border:#262b33; --border-strong:#333a44;
    --brand-soft:rgba(229,100,31,.16);
    --shadow-sm:0 1px 2px rgba(0,0,0,.4); --shadow-lg:0 14px 40px rgba(0,0,0,.5);
    color-scheme:dark;
  }}
  :root[data-theme=dark]{
    --bg:#0d0f12; --panel:#16191f; --panel-2:#1b1f26; --stage:#0a0c0f;
    --ink:#eef2f7; --muted:#8b95a4; --border:#262b33; --border-strong:#333a44;
    --brand-soft:rgba(229,100,31,.16);
    --shadow-sm:0 1px 2px rgba(0,0,0,.4); --shadow-lg:0 14px 40px rgba(0,0,0,.5);
    color-scheme:dark;
  }
  *{box-sizing:border-box;}
  html,body{height:100%;}
  body{margin:0;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
       background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;}
  button{font:inherit;color:inherit;cursor:pointer;}

  /* Header */
  header{display:flex;align-items:center;gap:16px;padding:14px 22px;background:var(--panel);border-bottom:1px solid var(--border);}
  .logo{width:30px;height:30px;border-radius:9px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800;font-size:15px;flex:none;}
  .h-txt h1{margin:0;font-size:15px;font-weight:700;letter-spacing:-.01em;}
  .h-txt .sub{color:var(--muted);font-size:12px;margin-top:1px;}
  .h-spacer{flex:1;}
  .icon-btn{width:38px;height:38px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--panel-2);
            display:grid;place-items:center;transition:.15s var(--ease);}
  .icon-btn:hover{border-color:var(--border-strong);transform:translateY(-1px);}
  .icon-btn svg{width:18px;height:18px;}
  .icon-btn .moon{display:none;} :root[data-theme=dark] .icon-btn .sun{display:none;}
  :root[data-theme=dark] .icon-btn .moon{display:block;}

  /* Layout */
  .layout{display:flex;height:calc(100vh - 61px);}
  .sidebar{width:266px;flex:none;border-right:1px solid var(--border);background:var(--panel);
           padding:14px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;}
  .side-label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:2px 6px 4px;}
  .card{display:flex;flex-direction:column;gap:7px;text-align:left;padding:13px 14px;border-radius:var(--r-md);
        border:1px solid var(--border);background:var(--panel-2);transition:.16s var(--ease);}
  .card:hover{border-color:var(--border-strong);transform:translateY(-1px);box-shadow:var(--shadow-sm);}
  .card.active{border-color:var(--brand);background:var(--brand-soft);box-shadow:none;}
  .card-top{display:flex;align-items:center;gap:8px;justify-content:space-between;}
  .card-name{font-weight:700;font-size:14px;letter-spacing:-.01em;}
  .card-kb{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums;}
  .chip{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:var(--r-pill);white-space:nowrap;}
  .chip-marketing{background:var(--brand-soft);color:var(--brand);}
  .chip-transactional{background:rgba(26,157,90,.14);color:var(--ok);}
  .chip-lifecycle{background:rgba(100,116,139,.16);color:var(--muted);}

  /* Viewer */
  .viewer{flex:1;display:flex;flex-direction:column;min-width:0;}
  .toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 20px;background:var(--panel);border-bottom:1px solid var(--border);}
  .crumb{display:flex;align-items:baseline;gap:9px;min-width:0;}
  .crumb .name{font-weight:700;font-size:14px;}
  .crumb .meta{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums;}
  .controls{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .seg{display:inline-flex;background:var(--panel-2);border:1px solid var(--border);border-radius:var(--r-sm);padding:3px;gap:2px;}
  .seg button{border:0;background:transparent;border-radius:6px;padding:6px 13px;font-size:13px;font-weight:600;color:var(--muted);transition:.14s var(--ease);}
  .seg button.active{background:var(--brand);color:var(--brand-ink);box-shadow:var(--shadow-sm);}
  .btn{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:var(--r-sm);font-size:13px;font-weight:600;
       border:1px solid var(--brand);background:var(--brand);color:var(--brand-ink);transition:.15s var(--ease);text-decoration:none;}
  .btn:hover{filter:brightness(1.05);transform:translateY(-1px);}
  .btn.ghost{background:var(--panel-2);color:var(--ink);border-color:var(--border);}
  .btn.ghost:hover{border-color:var(--border-strong);filter:none;}
  .btn.ok{background:var(--ok);border-color:var(--ok);color:#fff;}
  .btn svg{width:15px;height:15px;}

  /* Stage + device frame */
  .stage{flex:1;overflow:auto;background:
          radial-gradient(circle at 1px 1px,var(--border) 1px,transparent 0) 0 0/22px 22px,var(--stage);
          display:flex;justify-content:center;padding:30px 24px;}
  .device{background:var(--panel);border:1px solid var(--border-strong);border-radius:var(--r-lg);
           box-shadow:var(--shadow-lg);overflow:hidden;height:fit-content;transition:width .28s var(--ease);}
  .device-bar{height:34px;display:flex;align-items:center;gap:6px;padding:0 13px;background:var(--panel-2);border-bottom:1px solid var(--border);}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--border-strong);}
  .device-url{margin-left:8px;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;}
  iframe{display:block;border:0;width:100%;height:78vh;background:#fff;}

  /* Toast */
  .toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,18px);opacity:0;pointer-events:none;
         display:flex;align-items:center;gap:8px;background:var(--ink);color:var(--bg);
         padding:11px 18px;border-radius:var(--r-pill);font-size:13px;font-weight:600;box-shadow:var(--shadow-lg);
         transition:.24s var(--ease);z-index:40;}
  .toast.show{opacity:1;transform:translate(-50%,0);}
  .toast svg{width:16px;height:16px;}

  /* Merge-keys modal */
  .overlay{position:fixed;inset:0;background:rgba(8,12,20,.55);backdrop-filter:blur(2px);display:none;
           align-items:center;justify-content:center;padding:24px;z-index:30;}
  .overlay.open{display:flex;}
  .modal{width:min(620px,100%);max-height:82vh;display:flex;flex-direction:column;background:var(--panel);
         border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow-lg);overflow:hidden;}
  .modal-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border);}
  .modal-head h2{margin:0;font-size:15px;font-weight:700;}
  .modal-head .m-sub{color:var(--muted);font-size:12px;}
  .modal-head .close{margin-left:auto;width:32px;height:32px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--panel-2);display:grid;place-items:center;}
  .modal-head .close:hover{border-color:var(--border-strong);}
  .klist{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px;}
  .krow{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-md);border:1px solid transparent;}
  .krow:hover{background:var(--panel-2);border-color:var(--border);}
  .k-main{min-width:0;flex:1;}
  .k-code{display:inline-flex;align-items:center;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;color:var(--brand);}
  .k-desc{color:var(--muted);font-size:12px;margin-top:2px;line-height:1.4;}
  .k-copy{flex:none;width:32px;height:32px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--panel);display:grid;place-items:center;transition:.14s var(--ease);}
  .k-copy:hover{border-color:var(--brand);color:var(--brand);transform:translateY(-1px);}
  .k-copy.ok{border-color:var(--ok);color:var(--ok);}
  .k-copy svg{width:15px;height:15px;}
  .modal-foot{padding:12px 18px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:center;}
  .modal-foot .note{color:var(--muted);font-size:12px;}
  .modal-foot .spacer{flex:1;}
  /* Customize-assets rows */
  .arow{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-md);border:1px solid transparent;}
  .arow:hover{background:var(--panel-2);border-color:var(--border);}
  .a-thumb{width:40px;height:40px;flex:none;border-radius:var(--r-sm);border:1px solid var(--border);background:#fff center/contain no-repeat;background-size:70%;}
  .a-main{flex:1;min-width:0;}
  .a-name{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .a-input{width:100%;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;padding:7px 9px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--panel);color:var(--ink);}
  .a-input:focus{outline:none;border-color:var(--brand);}
  .a-input.local{border-color:#d9a441;} /* still a repo-relative / non-hosted path */
  .hint{color:var(--muted);font-size:11px;padding:6px 8px 2px;}
  kbd{font:inherit;font-size:10px;background:var(--panel-2);border:1px solid var(--border);border-bottom-width:2px;border-radius:5px;padding:1px 5px;}

  @media (max-width:820px){
    .layout{flex-direction:column;height:auto;}
    .sidebar{width:auto;flex-direction:row;overflow-x:auto;}
    .card{flex:none;min-width:190px;}
    .controls{width:100%;margin-left:0;}
    .device{width:100%!important;}
  }
</style></head>
<body>
  <header>
    <div class="logo">C</div>
    <div class="h-txt"><h1>COMACPRO — Email templates</h1><div class="sub">Preview gallery · built ${builtAt} · ${built.length} template(s)</div></div>
    <div class="h-spacer"></div>
    <a class="btn ghost" href="./tokens.html" style="margin-right:4px;">Design tokens ↗</a>
    <button class="icon-btn" id="theme" title="Toggle theme" aria-label="Toggle light / dark theme">
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6 6l-1.4-1.4M19.4 19.4 18 18M18 6l1.4-1.4M4.6 19.4 6 18"/></svg>
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z"/></svg>
    </button>
  </header>
  <div class="layout">
    <nav class="sidebar" role="listbox" aria-label="Templates">
          <div class="side-label">Templates</div>
          ${cards}
          <div class="hint">Switch with <kbd>↑</kbd> <kbd>↓</kbd></div>
    </nav>
    <main class="viewer">
      <div class="toolbar">
        <div class="crumb"><span class="name" id="crumbName"></span><span class="meta" id="crumbMeta"></span></div>
        <div class="controls">
          <div class="seg" id="wseg" role="group" aria-label="Preview width">
            <button data-w="700" class="active">Desktop</button>
            <button data-w="390">Mobile</button>
          </div>
          <button class="btn" id="assetbtn" title="Set hosted asset URLs, then copy the HTML">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
            <span>Copy HTML</span>
          </button>
          <button class="btn ghost" id="keysbtn" title="Merge keys this template needs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M4 12h16M4 17h10"/><path d="M18 5l2 2-2 2"/></svg>
            <span>Merge keys</span>
          </button>
          <a class="btn ghost" id="openRaw" target="_blank" rel="noopener" title="Open the shippable HTML with raw {{keys}}">Raw ↗</a>
        </div>
      </div>
      <div class="stage">
        <div class="device" id="device" style="width:700px">
          <div class="device-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="device-url" id="devUrl"></span></div>
          <iframe id="frame" title="email preview"></iframe>
        </div>
      </div>
    </main>
  </div>
  <div class="overlay" id="overlay">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Merge keys">
      <div class="modal-head">
        <div><h2>Merge keys</h2><div class="m-sub" id="mSub"></div></div>
        <button class="close" id="mClose" aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="klist" id="klist"></div>
      <div class="modal-foot"><span class="note">Click a row's icon to copy that key name (without <code>{{ }}</code>) for your sending system.</span></div>
    </div>
  </div>
  <div class="overlay" id="overlay2">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Customize assets">
      <div class="modal-head">
        <div><h2>Customize assets</h2><div class="m-sub" id="aSub"></div></div>
        <button class="close" id="aClose" aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="klist" id="alist"></div>
      <div class="modal-foot">
        <span class="note">Paste your hosted URL for each asset (amber = still a local path — won't load in an inbox).</span>
        <span class="spacer"></span>
        <button class="btn" id="acopy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          <span>Copy HTML</span>
        </button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    var names = ${names}, data = ${data}, keys = ${keys}, minB64 = ${minB64};
    function minHtml(name){ return new TextDecoder().decode(Uint8Array.from(atob(minB64[name]), function(c){return c.charCodeAt(0);})); }
    var $ = function(id){return document.getElementById(id);};
    var frame=$('frame'), device=$('device'), toastEl=$('toast'), toastT, current='';

    // Theme: system default, manual toggle persisted.
    var THEME='cmp-gallery-theme';
    function applyTheme(t){ if(t) document.documentElement.setAttribute('data-theme',t); else document.documentElement.removeAttribute('data-theme'); }
    try{ applyTheme(localStorage.getItem(THEME)); }catch(e){}
    $('theme').addEventListener('click',function(){
      var dark=document.documentElement.getAttribute('data-theme')==='dark'
        || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches);
      var next=dark?'light':'dark'; applyTheme(next);
      try{ localStorage.setItem(THEME,next); }catch(e){}
    });

    var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    function toast(m){ toastEl.innerHTML=CHECK+'<span>'+m+'</span>'; toastEl.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(function(){toastEl.classList.remove('show');},2000); }

    function select(name){
      if(names.indexOf(name)<0) name=names[0];
      current=name;
      frame.src='./'+name+'.preview.html';
      $('devUrl').textContent=name+'.preview.html';
      $('crumbName').textContent=name;
      $('crumbMeta').textContent=data[name].kb+' KB · '+data[name].category;
      $('openRaw').href='./'+name+'.html';
      Array.prototype.forEach.call(document.querySelectorAll('.card'),function(b){
        var on=b.getAttribute('data-name')===name; b.classList.toggle('active',on); b.setAttribute('aria-selected',on);
      });
      if(location.hash.slice(1)!==name) history.replaceState(null,'','#'+name);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.card'),function(b){
      b.addEventListener('click',function(){select(b.getAttribute('data-name'));});
    });
    Array.prototype.forEach.call(document.querySelectorAll('#wseg button'),function(b){
      b.addEventListener('click',function(){
        Array.prototype.forEach.call(document.querySelectorAll('#wseg button'),function(x){x.classList.remove('active');});
        b.classList.add('active'); device.style.width=b.getAttribute('data-w')+'px';
      });
    });
    // Merge-keys modal
    var COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function openKeys(){
      var list=keys[current]||[];
      $('mSub').textContent=current+' · '+list.length+' key'+(list.length===1?'':'s');
      $('klist').innerHTML=list.map(function(k){
        return '<div class="krow"><div class="k-main"><span class="k-code">{{'+esc(k.key)+'}}</span>'+
          (k.description?'<div class="k-desc">'+esc(k.description)+'</div>':'')+
          '</div><button class="k-copy" data-key="'+esc(k.key)+'" title="Copy '+esc(k.key)+'">'+COPY+'</button></div>';
      }).join('');
      Array.prototype.forEach.call($('klist').querySelectorAll('.k-copy'),function(btn){
        btn.addEventListener('click',function(){
          var key=btn.getAttribute('data-key');
          function done(){ btn.classList.add('ok'); btn.innerHTML=CHECK; toast('Copied '+key);
            setTimeout(function(){btn.classList.remove('ok'); btn.innerHTML=COPY;},1400); }
          if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(key).then(done).catch(done);
          else done();
        });
      });
      $('overlay').classList.add('open');
    }
    function closeKeys(){ $('overlay').classList.remove('open'); }
    $('keysbtn').addEventListener('click',openKeys);
    $('mClose').addEventListener('click',closeKeys);
    $('overlay').addEventListener('click',function(e){ if(e.target===$('overlay')) closeKeys(); });

    // Customize-assets modal: list every asset URL in the built HTML, let the user paste a hosted
    // URL for each, then copy the HTML with those substitutions applied (all client-side).
    var assetSrc=''; // cached min HTML for the current template
    function isLocal(u){ return /^\\.\\.\\//.test(u) || (!/^https?:/.test(u) && !/^\\{\\{/.test(u)); }
    function markInput(inp){ inp.classList.toggle('local', isLocal(inp.value)); }
    function openAssets(){
      assetSrc=minHtml(current);
      var re=/(?:src=|background=|url\\()["']?((?:https?:\\/\\/|\\.\\.\\/)[^"')\\s]+\\.(?:png|jpe?g|gif|svg|webp)(?:\\?[^"')\\s]*)?)/gi;
      var seen={}, urls=[], m;
      while((m=re.exec(assetSrc))){ if(!seen[m[1]]){ seen[m[1]]=1; urls.push(m[1]); } }
      $('aSub').textContent=current+' · '+urls.length+' asset'+(urls.length===1?'':'s');
      $('alist').innerHTML=urls.map(function(u,i){
        var name=u.split('/').pop();
        return '<div class="arow"><span class="a-thumb" style="background-image:url(\\''+u+'\\')"></span>'+
          '<div class="a-main"><div class="a-name" title="'+esc(u)+'">'+esc(name)+'</div>'+
          '<input class="a-input" data-orig="'+esc(u)+'" value="'+esc(u)+'" id="ain'+i+'"></div></div>';
      }).join('');
      Array.prototype.forEach.call($('alist').querySelectorAll('.a-input'),function(inp){
        markInput(inp); inp.addEventListener('input',function(){markInput(inp);});
      });
      $('overlay2').classList.add('open');
    }
    function closeAssets(){ $('overlay2').classList.remove('open'); }
    $('assetbtn').addEventListener('click',openAssets);
    $('aClose').addEventListener('click',closeAssets);
    $('overlay2').addEventListener('click',function(e){ if(e.target===$('overlay2')) closeAssets(); });
    $('acopy').addEventListener('click',function(){
      var out=assetSrc, changed=0;
      Array.prototype.forEach.call($('alist').querySelectorAll('.a-input'),function(inp){
        var orig=inp.getAttribute('data-orig'), val=inp.value.trim();
        if(val && val!==orig){ out=out.split(orig).join(val); changed++; }
      });
      var btn=this, span=btn.querySelector('span'), old=span.textContent;
      function done(){ btn.classList.add('ok'); span.textContent='Copied';
        toast('Copied HTML — '+current+(changed?' ('+changed+' asset'+(changed===1?'':'s')+' overridden)':' (no overrides)'));
        setTimeout(function(){btn.classList.remove('ok'); span.textContent=old;},1500); }
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(out).then(done).catch(done);
      else done();
    });
    document.addEventListener('keydown',function(e){
      if(e.target.tagName==='INPUT'||e.metaKey||e.ctrlKey) return;
      if(e.key==='Escape'){ closeKeys(); closeAssets(); return; }
      if($('overlay').classList.contains('open')||$('overlay2').classList.contains('open')) return;
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        var i=names.indexOf(current), d=e.key==='ArrowDown'?1:-1;
        select(names[(i+d+names.length)%names.length]);
      }
    });
    window.addEventListener('hashchange',function(){select(location.hash.slice(1));});
    select(location.hash.slice(1)||'${first}');
  </script>
</body></html>
`,
  );
}
