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
  :root { color-scheme: light dark; --bg:#f4f5f7; --panel:#fff; --border:#e6e8eb; --ink:#122941; --muted:#6b7280; --brand:#f37134; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0e1013; --panel:#191c22; --border:#2a2e36; --ink:#fff; --muted:#98a1ad; } }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; background:var(--bg); color:var(--ink); }
  header { position:sticky; top:0; z-index:5; padding:16px 24px; background:var(--panel); border-bottom:1px solid var(--border);
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
</style></head>
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
