import { writeFileSync } from 'node:fs';

import type { BuiltEmail } from './write-gallery.ts';

// Multi-client visual simulator. Emits dist/simulator.html — a local page that renders each
// built email inside <iframe>s sized to how real clients frame a message, so you can eyeball
// layout drift side-by-side WITHOUT a paid Litmus/Email-on-Acid account.
//
// It is a VIEWPORT + preview-panel simulator, not a rendering-engine emulator: the browser is
// still Blink/WebKit, so it can't reproduce Outlook's Word engine quirks (border-radius,
// object-fit, gradients). Those are covered by `npm run lint:email` + a real Outlook test.
// What it DOES catch: reflow/stacking at each width, the Gmail/Apple preview-pane column, the
// message-list snippet (preview text), and mobile break points.
//
// Loads the *.preview.html (sample-filled) so it reads like a sent message.

interface Viewport {
  id: string;
  label: string;
  sub: string;
  width: number;
}

// Widths reflect the usable message column each client gives an email, not the app chrome.
const VIEWPORTS: Viewport[] = [
  { id: 'desktop', label: 'Desktop webmail', sub: 'Gmail / Outlook.com · full width', width: 700 },
  { id: 'applemail', label: 'Apple Mail', sub: 'macOS reading pane', width: 600 },
  {
    id: 'preview-pane',
    label: 'Preview pane',
    sub: 'Outlook desktop · narrow list+reading split',
    width: 480,
  },
  { id: 'mobile', label: 'Mobile', sub: 'iPhone · Gmail/Apple Mail app', width: 375 },
  { id: 'mobile-sm', label: 'Small mobile', sub: '320px · smallest common width', width: 320 },
];

export function writeSimulator(outDir: string, built: BuiltEmail[], builtAt: string): void {
  const templateOptions = built
    .map(
      (e, i) =>
        `<option value="${e.name}"${i === 0 ? ' selected' : ''}>${e.name} · ${e.kb} KB</option>`,
    )
    .join('\n        ');

  const frames = VIEWPORTS.map(
    (v) => `      <figure class="frame" data-width="${v.width}">
        <figcaption><span class="ttl">${v.label}</span><span class="sub">${v.sub} · ${v.width}px</span></figcaption>
        <div class="screen" style="width:${v.width}px">
          <iframe title="${v.label}" loading="lazy" data-vp="${v.id}"></iframe>
        </div>
      </figure>`,
  ).join('\n');

  writeFileSync(
    `${outDir}/simulator.html`,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COMACPRO — Inbox simulator</title>
<style>
  :root { color-scheme: light dark; --bg:#f1eee7; --panel:#fbfaf6; --border:#e8e3d8; --ink:#3a372f; --muted:#8b877b; --brand:#d1774e; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme=light]){ --bg:#17161a; --panel:#211f24; --border:#2a2830; --ink:#e4e0d7; --muted:#948f86; --brand:#e0906a; color-scheme:dark; } }
  :root[data-theme=dark]{ --bg:#17161a; --panel:#211f24; --border:#2a2830; --ink:#e4e0d7; --muted:#948f86; --brand:#e0906a; color-scheme:dark; }
  .icon-btn{width:34px;height:34px;border-radius:9px;border:1px solid var(--border);background:transparent;display:grid;place-items:center;color:var(--muted);cursor:pointer;}
  .icon-btn:hover{color:var(--ink);} .icon-btn svg{width:17px;height:17px;}
  .icon-btn .moon{display:none;} :root[data-theme=dark] .icon-btn .sun{display:none;} :root[data-theme=dark] .icon-btn .moon{display:block;}
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; background:var(--bg); color:var(--ink); }
  header { position:sticky; top:0; z-index:5; padding:18px 24px 14px; background:var(--bg);
           display:flex; flex-wrap:wrap; gap:16px 24px; align-items:center; }
  h1 { margin:0; font-size:16px; }
  .sub { color:var(--muted); font-size:12px; }
  label { font-size:12px; color:var(--muted); display:flex; gap:8px; align-items:center; }
  select { font:inherit; font-size:13px; padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--panel); color:var(--ink); }
  .spacer { flex:1; }
  .note { font-size:12px; color:var(--muted); max-width:44ch; }
  .note b { color:var(--brand); }
  main { display:flex; flex-wrap:wrap; gap:24px; padding:24px; align-items:flex-start; }
  .frame { margin:0; background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:12px; }
  figcaption { display:flex; flex-direction:column; gap:2px; padding:2px 4px 10px; }
  .ttl { font-weight:700; font-size:13px; }
  .sub2 { color:var(--muted); }
  figcaption .sub { color:var(--muted); font-size:11px; }
  .screen { border:1px solid var(--border); border-radius:8px; overflow:hidden; background:#fff; }
  iframe { width:100%; height:900px; border:0; display:block; background:#fff; }
  .frame.tall iframe { height:1400px; }
</style>
<script>
  (function(){try{var t=localStorage.getItem('cmp-gallery-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
   window.__toggleTheme=function(){var d=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:dark)').matches);var n=d?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('cmp-gallery-theme',n);}catch(e){}};})();
</script></head>
<body>
  <header>
    <div>
      <h1>COMACPRO — Inbox simulator</h1>
      <div class="sub">built ${builtAt} · viewport + preview-pane simulation</div>
    </div>
    <label>Template
      <select id="tpl">
        ${templateOptions}
      </select>
    </label>
    <label><input type="checkbox" id="tall"> taller frames</label>
    <span class="spacer"></span>
    <p class="note">Blink/WebKit rendering — catches <b>reflow &amp; stacking</b> at each width. It can't emulate Outlook's Word engine; pair with <b>npm run lint:email</b> and one real Outlook test.</p>
    <button class="icon-btn" onclick="__toggleTheme()" title="Toggle theme" aria-label="Toggle light / dark theme">
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6 6l-1.4-1.4M19.4 19.4 18 18M18 6l1.4-1.4M4.6 19.4 6 18"/></svg>
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z"/></svg>
    </button>
  </header>
  <main id="frames">
${frames}
  </main>
  <script>
    var sel = document.getElementById('tpl');
    var tall = document.getElementById('tall');
    var frames = document.getElementById('frames');
    function load() {
      var name = sel.value;
      var src = './' + name + '.preview.html';
      frames.querySelectorAll('iframe').forEach(function (f) { f.src = src; });
      frames.querySelectorAll('.frame').forEach(function (f) { f.classList.toggle('tall', tall.checked); });
    }
    sel.addEventListener('change', load);
    tall.addEventListener('change', load);
    load();
  </script>
</body></html>
`,
  );
}
