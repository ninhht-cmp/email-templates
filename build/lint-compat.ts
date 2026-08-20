// Email-client compatibility linter.
//
// Static-analyses the built dist/*.html for CSS/markup that silently breaks in real
// inboxes — the things MJML does NOT guarantee once you hand-edit sections/head. It is a
// SAFETY NET for future edits, not an asset checker: image hosting (repo-relative paths,
// SVG-vs-PNG) is deliberately out of scope — those are swapped to CDN URLs before sending.
//
// Severity:
//   error → breaks layout/text in a mainstream client; fails `npm run lint:email`
//   warn  → degrades in one engine (usually Outlook's Word renderer) but stays legible
//   info  → FYI / confirms a safeguard is present
//
// Run:  npm run lint:email        (build first — it reads dist/, does not build)
import { readdirSync, readFileSync, statSync } from 'node:fs';

import { GMAIL_CLIP_KB, OUT_DIR } from './config.ts';

type Severity = 'error' | 'warn' | 'info';

interface Finding {
  severity: Severity;
  rule: string;
  client: string;
  message: string;
}

/** Count non-overlapping matches of a global regex. */
function count(html: string, re: RegExp): number {
  const m = html.match(re);
  return m ? m.length : 0;
}

/**
 * Strip Outlook-only conditional comments (`<!--[if mso]> … <![endif]-->`) so rules that
 * check "is this hidden from Outlook / only for Outlook" don't get fooled. Returns the
 * markup that NON-Outlook clients see.
 */
function withoutMsoOnly(html: string): string {
  return html.replace(/<!--\[if[^\]]*mso[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
}

function lintOne(filePath: string): Finding[] {
  const html = readFileSync(filePath, 'utf8');
  const kb = statSync(filePath).size / 1024;
  const nonOutlook = withoutMsoOnly(html);
  const out: Finding[] = [];
  const add = (severity: Severity, rule: string, client: string, message: string) =>
    out.push({ severity, rule, client, message });

  // ── Gmail message clipping ──────────────────────────────────────────────
  if (kb > GMAIL_CLIP_KB) {
    add(
      'error',
      'gmail-clip',
      'Gmail',
      `${kb.toFixed(1)} KB > ${GMAIL_CLIP_KB} KB — Gmail clips the tail and hides the unsubscribe. Run build:min or trim a section.`,
    );
  } else if (kb > GMAIL_CLIP_KB * 0.9) {
    add(
      'warn',
      'gmail-clip',
      'Gmail',
      `${kb.toFixed(1)} KB — within 10% of the ${GMAIL_CLIP_KB} KB clip limit. Watch size as sections are added.`,
    );
  } else {
    add(
      'info',
      'gmail-clip',
      'Gmail',
      `${kb.toFixed(1)} KB — comfortably under the ${GMAIL_CLIP_KB} KB clip limit.`,
    );
  }

  // ── DOCTYPE ─────────────────────────────────────────────────────────────
  if (!/^\s*<!doctype/i.test(html)) {
    add(
      'error',
      'doctype',
      'all',
      'Missing <!doctype> — Outlook/webmail fall into quirks mode and mis-size the layout.',
    );
  }

  // ── Absolute / fixed positioning — unsupported almost everywhere ─────────
  const posAbs = count(html, /position\s*:\s*(absolute|fixed)/gi);
  if (posAbs > 0) {
    add(
      'error',
      'positioning',
      'Gmail/Outlook',
      `${posAbs}× position:absolute|fixed — stripped by Gmail and ignored by Outlook; overlapped elements collapse. Use a composited image or table layout instead.`,
    );
  }

  // ── Flex / grid — no support in Outlook, unreliable in Gmail ─────────────
  const flex = count(nonOutlook, /display\s*:\s*(inline-)?(flex|grid)/gi);
  if (flex > 0) {
    add(
      'error',
      'flex-grid',
      'Outlook/Gmail',
      `${flex}× display:flex|grid — Outlook (Word engine) ignores it entirely and columns collapse to one stack. Use MJML columns / <table> cells.`,
    );
  }

  // ── background-image must have a VML fallback for Outlook ────────────────
  const bgUrl = count(nonOutlook, /background(-image)?\s*:[^;"']*url\(/gi);
  if (bgUrl > 0) {
    const hasVml = /v:rect|v:fill|mso/i.test(html);
    if (hasVml) {
      add(
        'info',
        'bg-image',
        'Outlook',
        `${bgUrl}× CSS background-image with a VML fallback present — renders in Outlook. Confirm the VML covers each one.`,
      );
    } else {
      add(
        'warn',
        'bg-image',
        'Outlook',
        `${bgUrl}× CSS background-image with NO VML (v:rect/v:fill) fallback — Outlook shows a blank band. Add the mso conditional or bake the image into a plain <img>.`,
      );
    }
  }

  // ── Scripts / forms / video — stripped or a spam signal ──────────────────
  for (const [tag, re] of [
    ['<script>', /<script[\s>]/gi],
    ['<form>', /<form[\s>]/gi],
    ['<video>', /<video[\s>]/gi],
    ['<iframe>', /<iframe[\s>]/gi],
  ] as const) {
    const n = count(html, re);
    if (n > 0)
      add(
        'error',
        'unsupported-tag',
        'all',
        `${n}× ${tag} — stripped by most clients and a spam-filter trigger. Remove it.`,
      );
  }

  // ── External stylesheet links must be hidden from non-font use ───────────
  // Font <link>s are fine (progressive enhancement, mso-guarded). A NON-font external
  // stylesheet won't load in Gmail/Outlook and its rules vanish.
  const nonFontLinks = (html.match(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi) ?? []).filter(
    (l) => !/fonts\.(googleapis|gstatic)\.com|font/i.test(l),
  );
  if (nonFontLinks.length > 0) {
    add(
      'error',
      'external-css',
      'Gmail/Outlook',
      `${nonFontLinks.length}× non-font <link rel=stylesheet> — external CSS does not load in most clients; inline the rules. (Font links are fine.)`,
    );
  }

  // ── CSS the Word engine drops silently — informational, MJML degrades OK ─
  const radius = count(html, /border-radius/gi);
  if (radius > 0)
    add(
      'info',
      'outlook-degrade',
      'Outlook',
      `${radius}× border-radius — Outlook desktop squares the corners (rest of layout unaffected). Expected.`,
    );
  const objFit = count(html, /object-fit/gi);
  if (objFit > 0)
    add(
      'info',
      'outlook-degrade',
      'Outlook',
      `${objFit}× object-fit — Outlook ignores it; a non-square source image is not cropped there. Host square crops.`,
    );

  // ── CSS custom properties / modern colour funcs — Outlook renders black ──
  const cssVar = count(nonOutlook, /var\(--/gi);
  if (cssVar > 0)
    add(
      'warn',
      'css-var',
      'Outlook',
      `${cssVar}× var(--…) custom property — Outlook desktop can't resolve it and falls back to inherited/black. Inline the literal value.`,
    );

  // ── role=presentation on layout tables — accessibility safeguard ─────────
  const roles = count(html, /role=["']presentation["']/gi);
  add(
    roles > 0 ? 'info' : 'warn',
    'a11y-tables',
    'Screen readers',
    roles > 0
      ? `${roles}× role="presentation" on layout tables — screen readers skip the grid scaffolding. Good.`
      : 'No role="presentation" on layout tables — screen readers may announce the layout grid as data.',
  );

  // ── Light-only pin — stops dark-mode clients auto-inverting the brand ────
  const colorScheme = /content=["']light["']/i.test(html) && /supported-color-schemes/i.test(html);
  add(
    colorScheme ? 'info' : 'warn',
    'dark-mode',
    'Apple Mail/iOS/Outlook.com',
    colorScheme
      ? 'color-scheme pinned to light — dark-mode clients render the brand as designed. Good.'
      : 'No color-scheme=light pin — dark-mode clients may auto-invert brand colours unpredictably.',
  );

  return out;
}

const RANK: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
const ICON: Record<Severity, string> = { error: '✗', warn: '⚠', info: '·' };

function main(): void {
  let files: string[];
  try {
    // Lint the shippable email files (<name>.html and <name>.min.html) — not the sample-filled
    // previews or the tooling pages (gallery / token reference), which are web pages that
    // legitimately use flex/grid etc.
    const TOOLING = new Set(['index.html', 'tokens.html']);
    files = readdirSync(OUT_DIR)
      .filter((f) => f.endsWith('.html') && !f.endsWith('.preview.html') && !TOOLING.has(f))
      .sort();
  } catch {
    console.error(`No ${OUT_DIR}/ directory. Run \`npm run build\` first.`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error(`No built emails in ${OUT_DIR}/. Run \`npm run build\` first.`);
    process.exit(1);
  }

  let errors = 0;
  let warns = 0;
  for (const file of files) {
    const name = file.replace(/\.html$/, '');
    const findings = lintOne(`${OUT_DIR}/${file}`).sort(
      (a, b) => RANK[a.severity] - RANK[b.severity],
    );
    console.log(`\n${name}`);
    for (const f of findings) {
      if (f.severity === 'error') errors++;
      if (f.severity === 'warn') warns++;
      console.log(`  ${ICON[f.severity]} [${f.client}] ${f.message}`);
    }
  }

  console.log(`\n${errors} error(s), ${warns} warning(s) across ${files.length} template(s).`);
  if (errors > 0) {
    console.error('Compatibility lint failed: fix the ✗ findings above.');
    process.exit(1);
  }
  console.log('Compatibility lint passed.');
}

main();
