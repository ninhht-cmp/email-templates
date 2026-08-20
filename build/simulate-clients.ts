// Client-family simulator. Writes, per email, two variants of the built preview into dist/sim/ that
// reproduce how the two "CSS-stripping" client families render — the ones a Blink/WebKit preview
// hides and that broke the columns before (see docs/email-testing.md):
//
//   <name>.newoutlook.html  — @media queries removed  → New Outlook / Outlook webview
//   <name>.ganga.html       — all <style> removed      → Gmail app on a non-Google account
//
// Open .newoutlook.html at a desktop width and .ganga.html at a phone width: the layout must hold
// (columns stay laid out via inline widths, nothing overflows). This is the guard for the fluid-
// hybrid `mw-<px>` values — a wrong one makes columns wrap or gap here. It does NOT emulate classic
// Outlook's Word engine; that still needs Litmus / Email-on-Acid or a real Outlook.
//
// Run:  npm run simulate   (build first — it reads dist/, does not build)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

import { OUT_DIR } from './config.ts';
import { stripMediaQueries, stripStyleBlocks } from './html-transforms.ts';

function main(): void {
  const simDir = `${OUT_DIR}/sim`;
  let previews: string[];
  try {
    previews = readdirSync(OUT_DIR).filter((f) => f.endsWith('.preview.html'));
  } catch {
    console.error(`No ${OUT_DIR}/ directory. Run \`npm run build\` first.`);
    process.exit(1);
  }
  if (previews.length === 0) {
    console.error(`No *.preview.html in ${OUT_DIR}/. Run \`npm run build\` first.`);
    process.exit(1);
  }

  mkdirSync(simDir, { recursive: true });
  for (const file of previews) {
    const name = file.replace('.preview.html', '');
    // dist/sim/ is one level deeper than dist/, so repo-relative preview asset paths need one more `../`.
    const html = readFileSync(`${OUT_DIR}/${file}`, 'utf8').replace(/\.\.\/src\//g, '../../src/');
    writeFileSync(`${simDir}/${name}.newoutlook.html`, stripMediaQueries(html));
    writeFileSync(`${simDir}/${name}.ganga.html`, stripStyleBlocks(html));
    console.log(`✓ ${simDir}/${name}.newoutlook.html   (media queries stripped — open ~700px)`);
    console.log(`✓ ${simDir}/${name}.ganga.html        (all <style> stripped — open ~390px)`);
  }
  console.log(
    '\nOpen the .newoutlook.html at a desktop width and the .ganga.html at a phone width.\n' +
      'Columns must stay laid out (no collapse, no overflow, mw- widths fit). Classic Outlook\n' +
      "(Word engine) can't be simulated here — use Litmus/EOA or a real Outlook for that.",
  );
}

main();
