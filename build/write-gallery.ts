import { writeFileSync } from 'node:fs';

export interface BuiltEmail {
  name: string;
  kb: string;
  category: string;
}

/** Emit `dist/index.html` — a preview gallery linking every built email. */
export function writeGallery(outDir: string, built: BuiltEmail[], builtAt: string): void {
  const cards = built
    .map(
      (email) => `    <a class="card" href="./${email.name}.html">
      <span class="name">${email.name}</span>
      <span class="meta">${email.kb} KB · ${email.category}</span>
    </a>`,
    )
    .join('\n');

  writeFileSync(
    `${outDir}/index.html`,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COMACPRO — Email templates</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; background:#f4f5f7; color:#122941; }
  header { padding:28px 32px; border-bottom:1px solid #e6e8eb; }
  h1 { margin:0; font-size:18px; } .sub { color:#6b7280; font-size:13px; margin-top:4px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; padding:24px 32px; }
  .card { display:flex; justify-content:space-between; align-items:center; padding:16px 18px; background:#fff;
          border:1px solid #e6e8eb; border-radius:10px; text-decoration:none; color:inherit; transition:.15s; }
  .card:hover { border-color:#f37134; box-shadow:0 2px 10px rgba(243,113,52,.12); }
  .name { font-weight:700; } .meta { color:#6b7280; font-size:12px; }
  @media (prefers-color-scheme: dark) {
    body { background:#0e1013; color:#fff; } header { border-color:#2a2e36; }
    .card { background:#191c22; border-color:#2a2e36; } .sub,.meta { color:#98a1ad; }
  }
</style></head>
<body>
  <header><h1>COMACPRO — Email templates</h1><div class="sub">Preview gallery · built ${builtAt} · ${built.length} template(s)</div></header>
  <main class="grid">
${cards}
  </main>
</body></html>
`,
  );
}
