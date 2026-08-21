// Asset staging + optimization — produces the ONE folder you upload to the CDN.
//
// The send workflow is: upload `dist/assets/` → paste each hosted URL into the gallery's
// "Customize assets" modal → copy the HTML. So this folder has to be COMPLETE: every local asset the
// emails reference, whether or not it needed changing. (It used to stage only the files that needed
// optimizing, which meant uploading it shipped an email with a missing logo.)
//
// Three actions, decided per asset:
//   rasterize  SVG → PNG at 2× the width the built HTML actually renders it at. Gmail and Outlook
//              render NOTHING for an SVG in <img>, so this is not an optimization, it is a fix.
//   recompress heavy photographic PNG → JPEG q85 (4:4:4 chroma, so a baked gradient stays smooth).
//   copy       already fine — staged unchanged so the folder is complete.
//
// dist/assets/MANIFEST.md maps every staged file back to the asset row it fills in the modal, so the
// upload-and-paste step is mechanical instead of a matching exercise.
//
// Run:  npm run build && npm run assets:optimize             (report only)
//       npm run build && npm run assets:optimize -- --write  (stage the files; needs ImageMagick)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { extractImageRefs } from './analyze.ts';
import { IMAGE_WARN_KB, OUT_DIR, RETINA_FACTOR } from './config.ts';
import { readImageSize } from './image-meta.ts';

const write = process.argv.includes('--write');
const STAGE = `${OUT_DIR}/assets`;

function haveMagick(): boolean {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** `../src/emails/x/assets/icons/find.svg` → `dist/assets/emails/x/assets/icons/find.png` */
function stagePath(src: string, ext: string): string {
  const clean = src.replace(/^\.\.\/src\//, '').replace(/\.[a-z0-9]+$/i, '');
  return `${STAGE}/${clean}.${ext}`;
}

type Action = 'rasterize' | 'recompress' | 'copy';

interface Job {
  action: Action;
  /** The asset URL as it appears in the built HTML — this is the row you match in the modal. */
  src: string;
  out: string;
  note: string;
  run: () => void;
}

/** Every local asset the built HTML references, with the render width when there is one. */
function localAssets(html: string): { src: string; width: number | null }[] {
  const found = new Map<string, number | null>();
  for (const { src, width } of extractImageRefs(html)) {
    if (src.startsWith('../')) found.set(src, width);
  }
  // Section backgrounds (mj-section background-url + the VML fill) carry no width attribute.
  for (const m of html.matchAll(
    /(?:background(?:-url)?=|url\()["']?(\.\.\/[^"')\s]+\.(?:png|jpe?g|gif|svg))/gi,
  )) {
    const src = m[1];
    if (src !== undefined && !found.has(src)) found.set(src, null);
  }
  return [...found].map(([src, width]) => ({ src, width }));
}

function collectJobs(): Job[] {
  const jobs: Job[] = [];
  const seen = new Set<string>();

  const emails = readdirSync(OUT_DIR).filter(
    (f) =>
      f.endsWith('.html') &&
      !/\.(?:min|preview)\.html$/.test(f) &&
      f !== 'index.html' &&
      f !== 'tokens.html',
  );

  for (const file of emails) {
    const html = readFileSync(`${OUT_DIR}/${file}`, 'utf8');

    for (const { src, width } of localAssets(html)) {
      if (seen.has(src)) continue;
      seen.add(src);
      const from = resolve(OUT_DIR, src);

      // ── SVG → PNG. Never optional: an SVG <img> is blank in Gmail and Outlook. ──────────────
      if (/\.svg$/i.test(src)) {
        const px = (width ?? 26) * RETINA_FACTOR;
        const out = stagePath(src, 'png');
        jobs.push({
          action: 'rasterize',
          src,
          out,
          note: `${px}×${px} (2× the ${width ?? 26}px it renders at)`,
          run: () => {
            mkdirSync(dirname(out), { recursive: true });
            // High density then downsample = clean edges; png32 keeps the alpha channel.
            execFileSync('magick', [
              '-background',
              'none',
              '-density',
              String(px * 4),
              from,
              '-resize',
              `${px}x${px}`,
              `png32:${out}`,
            ]);
          },
        });
        continue;
      }

      const size = readImageSize(from);
      const kb = size ? size.bytes / 1024 : 0;

      // ── Heavy photographic PNG → JPEG. Skipped when the alpha channel is actually used, since
      //    JPEG has none and flattening would put a black box behind the art. ──────────────────
      if (size && /\.png$/i.test(src) && kb > IMAGE_WARN_KB && size.width * size.height > 250_000) {
        let opaque = true;
        try {
          opaque =
            execFileSync('magick', [
              from,
              '-alpha',
              'extract',
              '-format',
              '%[fx:minima*255]',
              'info:',
            ])
              .toString()
              .trim() === '255';
        } catch {
          opaque = false; // can't tell → don't risk it
        }
        if (opaque) {
          const out = stagePath(src, 'jpg');
          jobs.push({
            action: 'recompress',
            src,
            out,
            note: `${kb.toFixed(0)} KB PNG → JPEG q85, 4:4:4 chroma (keeps a baked gradient smooth)`,
            run: () => {
              mkdirSync(dirname(out), { recursive: true });
              execFileSync('magick', [
                from,
                '-quality',
                '85',
                '-sampling-factor',
                '4:4:4',
                '-strip',
                out,
              ]);
            },
          });
          continue;
        }
      }

      // ── Already fine — stage unchanged so the upload folder is complete. ───────────────────
      const ext = src.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'png';
      const out = stagePath(src, ext);
      const soft =
        size && width !== null && size.width > 0 && size.width < width * RETINA_FACTOR
          ? ` — NOT retina (${size.width}px source at ${width}px render); re-export from the design source, no script can add pixels`
          : '';
      jobs.push({
        action: 'copy',
        src,
        out,
        note: `${kb.toFixed(0)} KB, unchanged${soft}`,
        run: () => {
          mkdirSync(dirname(out), { recursive: true });
          copyFileSync(from, out);
        },
      });
    }
  }

  return jobs;
}

function manifest(jobs: Job[]): string {
  const rows = jobs
    .map(
      (j) =>
        `| \`${j.src.split('/').pop()}\` | ${j.action} | \`${j.out.replace(`${STAGE}/`, '')}\` | ${j.note.replace(/\|/g, '\\|')} |`,
    )
    .join('\n');
  return (
    '# CDN upload manifest\n\n' +
    `Generated by \`npm run assets:optimize -- --write\`. ${jobs.length} asset(s).\n\n` +
    'Upload the files in this folder to the CDN **keeping the paths**, then in the gallery open\n' +
    '**Copy HTML → Customize assets** and paste each hosted URL into the row whose filename matches\n' +
    'the *Asset in template* column below.\n\n' +
    '> Note the extension can CHANGE: an icon listed as `.svg` in the modal is staged as `.png`\n' +
    '> (Gmail/Outlook show nothing for an SVG), and a heavy photo as `.jpg`. Paste the URL of the\n' +
    '> **staged** file — the modal does not care about the extension.\n\n' +
    '| Asset in template | Action | Staged file | Note |\n|---|---|---|---|\n' +
    rows +
    '\n'
  );
}

function main(): void {
  let jobs: Job[];
  try {
    jobs = collectJobs();
  } catch {
    console.error(`No built emails in ${OUT_DIR}/. Run \`npm run build\` first.`);
    process.exit(1);
  }

  if (jobs.length === 0) {
    console.log('No local assets in the built emails — everything already points at a hosted URL.');
    return;
  }

  if (write && !haveMagick()) {
    console.error(
      'ImageMagick (`magick`) is required for --write.\n' +
        '  Fedora: sudo dnf install ImageMagick   ·   macOS: brew install imagemagick\n' +
        'Without it this command still reports what needs doing.',
    );
    process.exit(1);
  }

  console.log(
    write
      ? `Staging ${jobs.length} asset(s) into ${STAGE}/ — upload this whole folder.\n`
      : `${jobs.length} asset(s) would be staged into ${STAGE}/ (dry run — pass -- --write)\n`,
  );

  const LABEL: Record<Action, string> = {
    rasterize: 'SVG → PNG   (blank in Gmail/Outlook as SVG)',
    recompress: 'PNG → JPEG  (photographic art)',
    copy: 'copy as-is  (already fine)',
  };
  for (const action of ['rasterize', 'recompress', 'copy'] as Action[]) {
    const group = jobs.filter((j) => j.action === action);
    if (group.length === 0) continue;
    console.log(`${LABEL[action]}  — ${group.length}`);
    for (const job of group) {
      if (write) job.run();
      const after = write ? readImageSize(job.out) : null;
      const size = after ? ` [${(after.bytes / 1024).toFixed(0)} KB]` : '';
      console.log(
        `  ${write ? '✓' : '·'} ${job.src.split('/').pop()} → ${job.out.replace(`${STAGE}/`, '')}${size}`,
      );
      console.log(`      ${job.note}`);
    }
    console.log();
  }

  if (write) {
    writeFileSync(`${STAGE}/MANIFEST.md`, manifest(jobs));
    const total = jobs.reduce((sum, j) => sum + (readImageSize(j.out)?.bytes ?? 0), 0);
    console.log(`✓ ${STAGE}/MANIFEST.md  (which staged file fills which modal row)`);
    console.log(`\nTotal staged: ${(total / 1024).toFixed(0)} KB across ${jobs.length} file(s).`);
    console.log(
      'Next: upload the folder to the CDN, then gallery → Copy HTML → Customize assets → paste each URL.',
    );
  } else {
    console.log('Re-run with `-- --write` to stage the files.');
  }
}

main();
