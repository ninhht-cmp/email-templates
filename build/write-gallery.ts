import { writeFileSync } from 'node:fs';

export interface BuiltEmail {
  name: string;
  kb: string;
  category: string;
}

/**
 * Emit dist/index.html — a preview gallery: pick a template from the sidebar, preview it in a framed
 * iframe at desktop/mobile width, open the raw/preview files, or copy its MINIFIED HTML to the
 * clipboard. Hash-routed (#<name>) so a specific template is directly linkable.
 */
export function writeGallery(outDir: string, built: BuiltEmail[], builtAt: string): void {
  const nav = built
    .map(
      (e, i) =>
        `<button class="nav${i === 0 ? ' active' : ''}" data-name="${e.name}">` +
        `<span class="nav-name">${e.name}</span>` +
        `<span class="nav-meta">${e.kb} KB · ${e.category}</span></button>`,
    )
    .join('\n        ');

  const names = JSON.stringify(built.map((e) => e.name));
  const metaMap = JSON.stringify(
    Object.fromEntries(built.map((e) => [e.name, `${e.kb} KB · ${e.category}`])),
  );
  const first = built[0]?.name ?? '';

  writeFileSync(
    `${outDir}/index.html`,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COMACPRO — Email templates</title>
<style>
  :root{color-scheme:light dark;--bg:#f4f5f7;--panel:#fff;--border:#e6e8eb;--ink:#122941;--muted:#6b7280;--brand:#e5641f;--brandsoft:rgba(229,100,31,.09);--stage:#eef0f3;}
  @media (prefers-color-scheme:dark){:root{--bg:#0e1013;--panel:#191c22;--border:#2a2e36;--ink:#fff;--muted:#98a1ad;--stage:#0b0d10;}}
  *{box-sizing:border-box;}
  body{margin:0;font:15px/1.5 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);}
  header{padding:14px 24px;border-bottom:1px solid var(--border);background:var(--panel);}
  h1{margin:0;font-size:16px;} .sub{color:var(--muted);font-size:12px;margin-top:2px;}
  .layout{display:flex;min-height:calc(100vh - 60px);}
  .sidebar{width:236px;flex:none;border-right:1px solid var(--border);background:var(--panel);padding:12px;display:flex;flex-direction:column;gap:6px;}
  .nav{display:flex;flex-direction:column;gap:2px;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid transparent;background:transparent;color:inherit;font:inherit;cursor:pointer;}
  .nav:hover{border-color:var(--border);}
  .nav.active{border-color:var(--brand);background:var(--brandsoft);}
  .nav-name{font-weight:700;} .nav-meta{color:var(--muted);font-size:12px;}
  .viewer{flex:1;display:flex;flex-direction:column;min-width:0;}
  .toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:11px 20px;border-bottom:1px solid var(--border);background:var(--panel);}
  .crumb{font-weight:700;font-size:14px;} .crumb .meta{color:var(--muted);font-weight:400;font-size:12px;margin-left:8px;}
  .controls{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;}
  .seg button{font:inherit;font-size:13px;padding:6px 12px;border:0;background:transparent;color:inherit;cursor:pointer;}
  .seg button.active{background:var(--brand);color:#fff;}
  .btn{font:inherit;font-size:13px;font-weight:600;padding:7px 13px;border-radius:8px;border:1px solid var(--brand);background:var(--brand);color:#fff;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
  .btn.ghost{background:transparent;color:var(--ink);border-color:var(--border);}
  .stage{flex:1;overflow:auto;background:var(--stage);display:flex;justify-content:center;padding:24px;}
  .frame-wrap{background:#fff;box-shadow:0 2px 18px rgba(0,0,0,.13);border-radius:8px;overflow:hidden;height:fit-content;transition:width .18s ease;}
  iframe{display:block;border:0;width:100%;height:82vh;background:#fff;}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(16px);opacity:0;background:var(--ink);color:var(--bg);padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;transition:.22s;pointer-events:none;z-index:9;}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
  @media (max-width:720px){.layout{flex-direction:column;min-height:0;}.sidebar{width:auto;flex-direction:row;overflow-x:auto;}.nav{flex:none;}.controls{width:100%;margin-left:0;}}
</style></head>
<body>
  <header><h1>COMACPRO — Email templates</h1><div class="sub">Preview gallery · built ${builtAt} · ${built.length} template(s)</div></header>
  <div class="layout">
    <nav class="sidebar">
        ${nav}
    </nav>
    <main class="viewer">
      <div class="toolbar">
        <div class="crumb"><span id="crumbName"></span><span class="meta" id="crumbMeta"></span></div>
        <div class="controls">
          <div class="seg" id="wseg">
            <button data-w="680" class="active">Desktop</button>
            <button data-w="390">Mobile</button>
          </div>
          <button class="btn" id="copymin">⧉ Copy minified</button>
          <button class="btn ghost" id="copyraw">⧉ Copy raw</button>
          <a class="btn ghost" id="openPreview" target="_blank" rel="noopener">Preview ↗</a>
          <a class="btn ghost" id="openRaw" target="_blank" rel="noopener">Raw ↗</a>
        </div>
      </div>
      <div class="stage">
        <div class="frame-wrap" id="wrap" style="width:680px"><iframe id="frame" title="email preview"></iframe></div>
      </div>
    </main>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    var names = ${names}, meta = ${metaMap};
    var frame = document.getElementById('frame'), wrap = document.getElementById('wrap');
    var toastEl = document.getElementById('toast'), toastT;
    function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show');},1900);}
    function select(name){
      if(names.indexOf(name)<0) name=names[0];
      frame.src='./'+name+'.preview.html';
      document.getElementById('crumbName').textContent=name;
      document.getElementById('crumbMeta').textContent=meta[name]||'';
      document.getElementById('openPreview').href='./'+name+'.preview.html';
      document.getElementById('openRaw').href='./'+name+'.html';
      document.getElementById('copymin').setAttribute('data-name',name);
      document.getElementById('copyraw').setAttribute('data-name',name);
      Array.prototype.forEach.call(document.querySelectorAll('.nav'),function(b){b.classList.toggle('active',b.getAttribute('data-name')===name);});
      if(location.hash.slice(1)!==name) history.replaceState(null,'','#'+name);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.nav'),function(b){b.addEventListener('click',function(){select(b.getAttribute('data-name'));});});
    Array.prototype.forEach.call(document.querySelectorAll('#wseg button'),function(b){b.addEventListener('click',function(){
      Array.prototype.forEach.call(document.querySelectorAll('#wseg button'),function(x){x.classList.remove('active');});
      b.classList.add('active'); wrap.style.width=b.getAttribute('data-w')+'px';
    });});
    function copyFile(file,label){
      var name=document.getElementById('copymin').getAttribute('data-name');
      fetch('./'+name+file).then(function(r){return r.text();}).then(function(t){
        if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
        throw new Error('no clipboard');
      }).then(function(){toast('Copied '+label+' HTML — '+name);}).catch(function(){
        window.open('./'+name+file,'_blank'); toast('Clipboard blocked — opened '+file+' (select all, copy)');
      });
    }
    document.getElementById('copymin').addEventListener('click',function(){copyFile('.min.html','minified');});
    document.getElementById('copyraw').addEventListener('click',function(){copyFile('.html','raw');});
    window.addEventListener('hashchange',function(){select(location.hash.slice(1));});
    select(location.hash.slice(1)||'${first}');
  </script>
</body></html>
`,
  );
}
