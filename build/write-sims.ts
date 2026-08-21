// Client-family simulations (dist/sim/<name>.{newoutlook,ganga}.html).
//
// Two client families STRIP CSS before rendering, so they collapse multi-column layouts in ways a
// browser preview cannot show — this is what broke the columns before the fluid-hybrid approach:
//
//   <name>.newoutlook.html  — @media queries removed  → New Outlook / Outlook webview
//   <name>.ganga.html       — all <style> removed      → Gmail app on a non-Google account
//
// Open the .newoutlook one at a desktop width and the .ganga one at a phone width: the layout must
// hold on inline widths alone (the `max-width` injected by applyFluidMaxWidth). Neither emulates
// classic Outlook's Word engine — that still needs Litmus / Email-on-Acid or a real Outlook.
//
// Written on EVERY build, and linked from the gallery, so layer 3 of docs/email-testing.md is always
// one click away instead of behind a command you have to remember. There is deliberately no separate
// `npm run simulate`: it re-read from disk and re-applied these same two transforms, i.e. a second
// copy of this logic that could drift from the one the build actually uses.
import { writeFileSync } from 'node:fs';

import { stripMediaQueries, stripStyleBlocks } from './html-transforms.ts';

/**
 * Write both simulations for one email. Takes the SAMPLE-FILLED preview (not the shippable HTML) so
 * the sims read like a real message rather than a page of `{{merge_tags}}`.
 */
export function writeSims(outDir: string, name: string, previewHtml: string): void {
  // dist/sim/ is one level deeper than dist/, so repo-relative asset paths need one more `../`.
  const source = previewHtml.replace(/\.\.\/src\//g, '../../src/');
  writeFileSync(`${outDir}/sim/${name}.newoutlook.html`, stripMediaQueries(source));
  writeFileSync(`${outDir}/sim/${name}.ganga.html`, stripStyleBlocks(source));
}
