import { writeFileSync } from 'node:fs';

import type { Tokens } from './schema.ts';

// Emit dist/tokens.html — a design-system reference generated FROM tokens.ts (the source of truth),
// so it can't drift from what the emails actually use: colour swatches (grouped, with hex) and the
// radius scale, rendered live. Shares the gallery's light/dark theming.

/** A light heuristic to group the flat color map into labelled sections for display. */
function colorGroup(key: string): string {
  if (/orange|navy|hero|whatsapp/.test(key)) return 'Brand & accent';
  if (/body|muted|footer|heading/.test(key)) return 'Text';
  if (/hairline|divider|canvas|white|sky|panel/.test(key)) return 'Lines & surfaces';
  return 'Badges & other';
}

export function writeTokensPage(outDir: string, tokens: Tokens, builtAt: string): void {
  const colors = Object.entries(tokens.color);
  const groups = ['Brand & accent', 'Text', 'Lines & surfaces', 'Badges & other'];
  const swatches = groups
    .map((g) => {
      const items = colors
        .filter(([k]) => colorGroup(k) === g)
        .map(
          ([k, v]) =>
            `<div class="sw"><span class="chip-color" style="background:${v}"></span>
              <div class="sw-txt"><code>${k}</code><span class="hex">${v}</span></div></div>`,
        )
        .join('\n            ');
      return items ? `<h2>${g}</h2>\n          <div class="grid">${items}</div>` : '';
    })
    .join('\n          ');

  const radii = Object.entries(tokens.radius)
    .map(
      ([k, v]) =>
        `<div class="radius-item"><span class="radius-demo" style="border-radius:${v}"></span>
          <code>radius.${k}</code><span class="hex">${v}</span></div>`,
    )
    .join('\n          ');

  writeFileSync(
    `${outDir}/tokens.html`,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COMACPRO — Design tokens</title>
<style>
  /* Matches the gallery's soft/paper system: warm-neutral chrome, restrained accent, hairlines. */
  :root{--brand:#d1774e;--bg:#f1eee7;--panel:#fbfaf6;--panel-2:#f0ede5;--ink:#3a372f;--muted:#8b877b;
        --border:#e8e3d8;--demo:#cbc5b7;--shadow:0 1px 3px rgba(58,55,47,.06);--r:12px;color-scheme:light;}
  @media (prefers-color-scheme:dark){:root:not([data-theme=light]){--brand:#e0906a;--bg:#17161a;--panel:#211f24;--panel-2:#2a272d;--ink:#e4e0d7;--muted:#948f86;--border:#2a2830;--demo:#39363f;color-scheme:dark;}}
  :root[data-theme=dark]{--brand:#e0906a;--bg:#17161a;--panel:#211f24;--panel-2:#2a272d;--ink:#e4e0d7;--muted:#948f86;--border:#2a2830;--demo:#39363f;color-scheme:dark;}
  *{box-sizing:border-box;}
  body{margin:0;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;}
  header{display:flex;align-items:center;gap:14px;padding:18px 26px 14px;background:transparent;}
  h1{margin:0;font-size:14px;font-weight:400;letter-spacing:.01em;color:var(--muted);}
  h1 b{font-weight:650;letter-spacing:-.01em;color:var(--ink);margin-right:5px;}
  .sub{color:var(--muted);font-size:11px;margin-top:2px;font-variant-numeric:tabular-nums;}
  a.back{margin-left:auto;color:var(--muted);text-decoration:none;font-weight:500;font-size:12.5px;transition:color .15s;}
  a.back:hover{color:var(--ink);}
  .icon-btn{width:34px;height:34px;border-radius:9px;border:1px solid var(--border);background:transparent;
            display:grid;place-items:center;color:var(--muted);cursor:pointer;transition:.15s;}
  .icon-btn:hover{color:var(--ink);}
  .icon-btn svg{width:17px;height:17px;}
  .icon-btn .moon{display:none;} :root[data-theme=dark] .icon-btn .sun{display:none;}
  :root[data-theme=dark] .icon-btn .moon{display:block;}
  main{max-width:1000px;margin:0 auto;padding:22px 26px 64px;}
  h2{font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--muted);margin:34px 0 12px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;}
  .sw{display:flex;align-items:center;gap:11px;padding:10px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);}
  .chip-color{width:38px;height:38px;border-radius:9px;border:1px solid rgba(0,0,0,.06);flex:none;}
  .sw-txt{display:flex;flex-direction:column;gap:1px;min-width:0;}
  code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;}
  .hex{color:var(--muted);font:11px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;}
  .radii{display:flex;gap:18px;flex-wrap:wrap;}
  .radius-item{display:flex;flex-direction:column;align-items:center;gap:8px;}
  /* Neutral demo fill so the RADIUS is the point, not the colour (no orange soup). */
  .radius-demo{width:76px;height:56px;background:var(--demo);display:block;}
</style>
<script>
  /* Apply the shared theme (set by any tooling page's toggle) before paint — no flash. */
  (function(){try{var t=localStorage.getItem('cmp-gallery-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
   window.__toggleTheme=function(){var d=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:dark)').matches);var n=d?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('cmp-gallery-theme',n);}catch(e){}};})();
</script></head>
<body>
  <header>
    <div><h1><b>COMACPRO</b>Design tokens</h1><div class="sub">Generated from tokens.ts · built ${builtAt}</div></div>
    <a class="back" href="./index.html">← Templates</a>
    <button class="icon-btn" onclick="__toggleTheme()" title="Toggle theme" aria-label="Toggle light / dark theme">
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6 6l-1.4-1.4M19.4 19.4 18 18M18 6l1.4-1.4M4.6 19.4 6 18"/></svg>
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z"/></svg>
    </button>
  </header>
  <main>
    <section>${swatches}</section>
    <h2>Radius scale</h2>
    <div class="radii">
          ${radii}
    </div>
  </main>
</body></html>
`,
  );
}
