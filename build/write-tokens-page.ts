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
  :root{--brand:#e5641f;--bg:#f5f6f8;--panel:#fff;--ink:#12263a;--muted:#64748b;--border:#e6e9ee;
        --shadow:0 1px 2px rgba(16,32,58,.06),0 1px 3px rgba(16,32,58,.05);--r:14px;color-scheme:light;}
  @media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0d0f12;--panel:#16191f;--ink:#eef2f7;--muted:#8b95a4;--border:#262b33;color-scheme:dark;}}
  :root[data-theme=dark]{--bg:#0d0f12;--panel:#16191f;--ink:#eef2f7;--muted:#8b95a4;--border:#262b33;color-scheme:dark;}
  *{box-sizing:border-box;}
  body{margin:0;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;}
  header{display:flex;align-items:center;gap:14px;padding:16px 26px;background:var(--panel);border-bottom:1px solid var(--border);}
  h1{margin:0;font-size:15px;} .sub{color:var(--muted);font-size:12px;}
  a.back{margin-left:auto;color:var(--brand);text-decoration:none;font-weight:600;font-size:13px;}
  main{max-width:1000px;margin:0 auto;padding:28px 26px 60px;}
  h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:30px 0 12px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;}
  .sw{display:flex;align-items:center;gap:11px;padding:10px;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);}
  .chip-color{width:38px;height:38px;border-radius:9px;border:1px solid rgba(0,0,0,.08);flex:none;}
  .sw-txt{display:flex;flex-direction:column;gap:1px;min-width:0;}
  code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;}
  .hex{color:var(--muted);font:11px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;}
  .radii{display:flex;gap:18px;flex-wrap:wrap;}
  .radius-item{display:flex;flex-direction:column;align-items:center;gap:6px;}
  .radius-demo{width:76px;height:56px;background:var(--brand);display:block;}
</style></head>
<body>
  <header>
    <div><h1>COMACPRO — Design tokens</h1><div class="sub">Generated from tokens.ts · built ${builtAt}</div></div>
    <a class="back" href="./index.html">← Templates</a>
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
