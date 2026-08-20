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
  /* Soft / paper: low-contrast warm palette, muted terracotta accent (not the full-strength brand
     orange), soft ink text. Borderless chrome — surfaces separate by tone + gentle shadow, not lines.
     A floating sticky toolbar is the only "object" over the preview canvas. */
  :root{
    --brand:#d1774e; --brand-soft:rgba(209,119,78,.12);
    --app:#f1eee7; --bg:#f1eee7; --surface:#fbfaf6; --panel:#fbfaf6; --panel-2:#f0ede5;
    --stage:#e9e5db; --canvas:#e9e5db;
    --ink:#3a372f; --muted:#8b877b; --faint:#b2ada0;
    --border:#e8e3d8; --border-strong:#ddd7c9;
    --primary:#403c33; --primary-ink:#faf9f5; --ok:#5f8f63;
    --shadow-sm:0 1px 3px rgba(58,55,47,.06);
    --shadow-md:0 6px 20px -6px rgba(58,55,47,.14);
    --shadow-lg:0 22px 55px -18px rgba(58,55,47,.26);
    --r-lg:16px; --r-md:12px; --r-sm:9px; --r-pill:999px;
    --ease:cubic-bezier(.2,.7,.3,1);
    color-scheme:light;
  }
  @media (prefers-color-scheme:dark){ :root:not([data-theme=light]){
    --brand:#e0906a; --brand-soft:rgba(224,144,106,.15);
    --app:#17161a; --bg:#17161a; --surface:#211f24; --panel:#211f24; --panel-2:#2a272d;
    --stage:#110f13; --canvas:#110f13;
    --ink:#e4e0d7; --muted:#948f86; --faint:#615d57;
    --border:#2a2830; --border-strong:#38343d;
    --primary:#e4e0d7; --primary-ink:#211f24; --ok:#6fae74;
    --shadow-sm:0 1px 3px rgba(0,0,0,.45);
    --shadow-md:0 8px 24px -6px rgba(0,0,0,.55); --shadow-lg:0 24px 60px -18px rgba(0,0,0,.72);
    color-scheme:dark;
  }}
  :root[data-theme=dark]{
    --brand:#e0906a; --brand-soft:rgba(224,144,106,.15);
    --app:#17161a; --bg:#17161a; --surface:#211f24; --panel:#211f24; --panel-2:#2a272d;
    --stage:#110f13; --canvas:#110f13;
    --ink:#e4e0d7; --muted:#948f86; --faint:#615d57;
    --border:#2a2830; --border-strong:#38343d;
    --primary:#e4e0d7; --primary-ink:#211f24; --ok:#6fae74;
    --shadow-sm:0 1px 3px rgba(0,0,0,.45);
    --shadow-md:0 8px 24px -6px rgba(0,0,0,.55); --shadow-lg:0 24px 60px -18px rgba(0,0,0,.72);
    color-scheme:dark;
  }
  *{box-sizing:border-box;}
  html,body{height:100%;}
  body{margin:0;display:flex;flex-direction:column;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
       background:var(--app);color:var(--ink);-webkit-font-smoothing:antialiased;}
  button{font:inherit;color:inherit;cursor:pointer;}

  /* Header — borderless, sits on the app bg */
  header{display:flex;align-items:center;gap:14px;padding:18px 26px 14px;background:transparent;}
  .brandmark{display:flex;align-items:center;gap:11px;}
  .h-txt h1{margin:0;font-size:14px;font-weight:400;letter-spacing:.01em;color:var(--muted);}
  .h-txt h1 b{font-weight:650;letter-spacing:-.01em;color:var(--ink);margin-right:5px;}
  .h-txt .sub{color:var(--muted);font-size:11px;margin-top:2px;font-variant-numeric:tabular-nums;}
  .h-spacer{flex:1;}
  .tlink{color:var(--muted);text-decoration:none;font-size:12.5px;font-weight:500;transition:color .15s var(--ease);}
  .tlink:hover{color:var(--ink);}
  .icon-btn{width:34px;height:34px;border-radius:var(--r-sm);border:1px solid var(--border);background:transparent;
            display:grid;place-items:center;color:var(--muted);transition:.15s var(--ease);}
  .icon-btn:hover{border-color:var(--border-strong);color:var(--ink);}
  .icon-btn svg{width:17px;height:17px;}
  .icon-btn .moon{display:none;} :root[data-theme=dark] .icon-btn .sun{display:none;}
  :root[data-theme=dark] .icon-btn .moon{display:block;}

  /* Layout — fills below the header; both columns borderless on the app bg */
  .layout{flex:1;min-height:0;display:flex;gap:0;padding:0 14px 14px;}
  .sidebar{width:236px;flex:none;background:transparent;padding:6px 8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;}
  .side-label{font-size:10.5px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);padding:2px 12px 12px;}
  /* Rows, not cards: quiet, with a left orange rail marking the active one (brand as thin accent). */
  .card{position:relative;display:flex;flex-direction:column;gap:3px;text-align:left;padding:9px 12px;
        border-radius:var(--r-sm);border:0;background:transparent;transition:background .14s var(--ease);}
  .card:hover{background:var(--panel-2);}
  .card.active{background:var(--brand-soft);}
  .card-top{display:flex;align-items:baseline;gap:8px;justify-content:space-between;}
  .card-name{font-weight:550;font-size:13.5px;letter-spacing:-.01em;color:var(--ink);}
  .card-kb{color:var(--muted);font-size:11.5px;font-variant-numeric:tabular-nums;flex:none;}
  .chip{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);white-space:nowrap;}

  /* Viewer = a soft rounded preview canvas; controls live in a floating sticky pill inside it */
  .viewer{flex:1;min-width:0;display:flex;}
  .canvas{flex:1;min-width:0;background:var(--canvas);border-radius:var(--r-lg);box-shadow:inset 0 0 0 1px var(--border);}
  .scroll{height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:16px 24px 52px;}
  /* macOS-style floating toolbar: soft rounded-rectangle (not a full capsule), with rounded-rect
     controls inside — reads like a macOS command bar / Spotlight. */
  .floatbar{position:sticky;top:0;z-index:5;display:inline-flex;align-items:center;gap:5px;padding:7px;margin-bottom:22px;
            background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-md);}
  .floatbar .seg button{border-radius:9px;}
  .fb-sep{width:1px;height:20px;background:var(--border);margin:0 3px;flex:none;}
  .caption{display:flex;align-items:baseline;gap:9px;justify-content:center;margin-bottom:16px;}
  .caption .name{font-weight:600;font-size:14px;letter-spacing:-.01em;}
  .caption .meta{color:var(--muted);font-size:11.5px;font-variant-numeric:tabular-nums;}
  .seg{display:inline-flex;gap:2px;}
  .seg button{border:0;background:transparent;border-radius:var(--r-pill);padding:6px 13px;font-size:12.5px;font-weight:500;color:var(--muted);transition:.14s var(--ease);}
  .seg button:hover{color:var(--ink);}
  .seg button.active{background:var(--ink);color:var(--surface);font-weight:550;}
  /* Primary = soft ink (one confident action). Ghost = borderless, hover-tint. No orange fills. */
  .btn{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:10px;font-size:12.5px;font-weight:550;white-space:nowrap;
       border:1px solid var(--primary);background:var(--primary);color:var(--primary-ink);transition:.15s var(--ease);text-decoration:none;}
  .btn:hover{opacity:.9;}
  .btn.ghost{background:transparent;color:var(--ink);border-color:transparent;font-weight:500;}
  .btn.ghost:hover{background:var(--panel-2);border-color:transparent;opacity:1;}
  .btn.ok{background:var(--ok);border-color:var(--ok);color:#fff;}
  .btn svg{width:15px;height:15px;}

  /* The framed email — the hero object on the soft canvas */
  .device{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:var(--r-md);
           box-shadow:var(--shadow-lg);overflow:hidden;height:fit-content;transition:width .28s var(--ease);}
  .device-bar{height:32px;display:flex;align-items:center;gap:6px;padding:0 13px;background:#f3f2ef;border-bottom:1px solid #e7e4df;}
  .dot{width:9px;height:9px;border-radius:50%;background:#cfcbc3;}
  .device-url{margin-left:8px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a877f;}
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
  .a-input.need{border-color:#d9a441;background:rgba(217,164,65,.07);} /* required: hosted URL not yet filled */
  .btn[aria-disabled=true]{opacity:.42;pointer-events:none;filter:grayscale(.25);}
  .a-status{font-size:12px;color:var(--muted);}
  .a-status.ready{color:var(--ok);font-weight:600;}
  .hint{color:var(--muted);font-size:11px;padding:6px 8px 2px;}
  kbd{font:inherit;font-size:10px;background:var(--panel-2);border:1px solid var(--border);border-bottom-width:2px;border-radius:5px;padding:1px 5px;}

  @media (max-width:820px){
    .layout{flex-direction:column;min-height:0;}
    .sidebar{width:auto;flex-direction:row;overflow-x:auto;padding:4px 4px 10px;}
    .card{flex:none;min-width:170px;}
    .canvas{min-height:70vh;}
    .floatbar{flex-wrap:wrap;justify-content:center;border-radius:var(--r-md);}
    .device{width:100%!important;}
  }
</style></head>
<body>
  <header>
    <div class="brandmark">
      <div class="h-txt"><h1><b>COMACPRO</b>Email templates</h1><div class="sub">Preview gallery · built ${builtAt} · ${built.length} template(s)</div></div>
    </div>
    <div class="h-spacer"></div>
    <a class="tlink" href="./tokens.html" style="margin-right:6px;">Design tokens ↗</a>
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
      <div class="canvas">
        <div class="scroll">
          <div class="floatbar">
            <div class="seg" id="wseg" role="group" aria-label="Preview width">
              <button data-w="700" class="active">Desktop</button>
              <button data-w="390">Mobile</button>
            </div>
            <span class="fb-sep"></span>
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
          <div class="caption"><span class="name" id="crumbName"></span><span class="meta" id="crumbMeta"></span></div>
          <div class="device" id="device" style="width:700px">
            <div class="device-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="device-url" id="devUrl"></span></div>
            <iframe id="frame" title="email preview"></iframe>
          </div>
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
        <span class="a-status" id="aStatus"></span>
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

    // Customize-assets modal: list every asset URL in the built HTML. Assets that are still a LOCAL
    // repo path must be given a hosted URL (input starts empty, required); already-hosted assets are
    // prefilled and optional. Copy HTML is gated until every local asset has a valid https(s) URL, so
    // no local path can ship by accident. All client-side, applied to the base64-inlined min HTML.
    var assetSrc=''; // cached min HTML for the current template
    function isLocalUrl(u){ return /^\\.\\.\\//.test(u) || !/^https?:\\/\\//.test(u); }
    function validUrl(v){ return /^https?:\\/\\/\\S+$/.test(v.trim()); }
    function refreshAssets(){
      var reqs=$('alist').querySelectorAll('.a-input[data-required]'), pending=0;
      Array.prototype.forEach.call(reqs,function(inp){
        var ok=validUrl(inp.value); inp.classList.toggle('need',!ok); if(!ok) pending++;
      });
      var st=$('aStatus'), btn=$('acopy');
      st.classList.toggle('ready',pending===0);
      st.textContent = pending===0 ? '✓ All assets hosted — ready to copy'
        : pending+' asset'+(pending===1?'':'s')+' still need a hosted URL';
      btn.setAttribute('aria-disabled', pending>0 ? 'true' : 'false');
    }
    function openAssets(){
      assetSrc=minHtml(current);
      var re=/(?:src=|background=|url\\()["']?((?:https?:\\/\\/|\\.\\.\\/)[^"')\\s]+\\.(?:png|jpe?g|gif|svg|webp)(?:\\?[^"')\\s]*)?)/gi;
      var seen={}, urls=[], m;
      while((m=re.exec(assetSrc))){ if(!seen[m[1]]){ seen[m[1]]=1; urls.push(m[1]); } }
      $('aSub').textContent=current+' · '+urls.length+' asset'+(urls.length===1?'':'s');
      $('alist').innerHTML=urls.map(function(u,i){
        var name=u.split('/').pop(), local=isLocalUrl(u);
        // Local asset → empty required input (don't prefill the unusable local path); hosted → prefill.
        var attrs=local ? 'value="" placeholder="Paste hosted https:// URL…" data-required="1"' : 'value="'+esc(u)+'"';
        return '<div class="arow"><span class="a-thumb" style="background-image:url(\\''+u+'\\')"></span>'+
          '<div class="a-main"><div class="a-name" title="'+esc(u)+'">'+esc(name)+(local?' · needs hosting':'')+'</div>'+
          '<input class="a-input" data-orig="'+esc(u)+'" '+attrs+' id="ain'+i+'"></div></div>';
      }).join('');
      Array.prototype.forEach.call($('alist').querySelectorAll('.a-input'),function(inp){
        inp.addEventListener('input',refreshAssets);
      });
      refreshAssets();
      $('overlay2').classList.add('open');
    }
    function closeAssets(){ $('overlay2').classList.remove('open'); }
    $('assetbtn').addEventListener('click',openAssets);
    $('aClose').addEventListener('click',closeAssets);
    $('overlay2').addEventListener('click',function(e){ if(e.target===$('overlay2')) closeAssets(); });
    $('acopy').addEventListener('click',function(){
      if(this.getAttribute('aria-disabled')==='true') return; // gated: local assets not all hosted
      var out=assetSrc, changed=0;
      Array.prototype.forEach.call($('alist').querySelectorAll('.a-input'),function(inp){
        var orig=inp.getAttribute('data-orig'), val=inp.value.trim();
        if(val && val!==orig){ out=out.split(orig).join(val); changed++; }
      });
      var btn=this, span=btn.querySelector('span'), old=span.textContent;
      function done(){ btn.classList.add('ok'); span.textContent='Copied';
        toast('Copied HTML — '+current+(changed?' ('+changed+' asset'+(changed===1?'':'s')+' set)':''));
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
