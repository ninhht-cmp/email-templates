// Asset quality gate. The build already checks whether an image is HOSTED; this checks whether it
// is any GOOD — the two failures that a desktop preview cannot show you:
//
//   · not retina  — a source narrower than 2× its render width is soft on every phone/laptop that
//                   reads mail. Invisible locally, obvious in the inbox.
//   · too heavy   — a multi-MB PNG of a photograph. Costs the recipient mobile data and delays the
//                   render past the point they've decided whether to read.
//
// Advisory (never fails the build): only LOCAL files can be measured, so a pass here is "nothing
// measurable is wrong", not "all assets are fine". `npm run assets:optimize` fixes what it reports.
import { resolve } from 'node:path';

import { extractImageRefs } from './analyze.ts';
import { IMAGE_WARN_KB, OUT_DIR, RETINA_FACTOR } from './config.ts';
import { readImageSize } from './image-meta.ts';

export interface AssetAdvisory {
  src: string;
  message: string;
  /**
   * True when the asset only appears in the sample-filled preview, never in the shippable HTML
   * (i.e. it stands in for a merge tag, like the sample avatar behind `{{sender_avatar}}`). It costs
   * the gallery and the published Pages site rather than a recipient — worth reporting, lower stakes.
   */
  previewOnly?: boolean;
}

/**
 * Check every local raster image referenced by the built HTML. Asset URLs in the output are
 * relative to OUT_DIR (`../src/…`), so they resolve from there.
 */
/** Local raster images used as a CSS/VML section background — they have no width attribute. */
function backgroundImages(html: string): string[] {
  const found = [
    ...html.matchAll(/(?:background(?:-url)?=|url\()["']?(\.\.\/[^"')\s]+\.(?:png|jpe?g|gif))/gi),
  ].map((m) => m[1] ?? '');
  return [...new Set(found)];
}

/**
 * Pass `previewHtml` as well as the shippable HTML: some assets exist ONLY in the preview, because
 * in the shippable copy their slot is a merge tag (`{{sender_avatar}}`) the sending system fills.
 * Scanning the shippable copy alone left those unmeasured — which is how a 1123×1400 / 1.4 MB sample
 * avatar rendered at 88×88 sat in the repo, and got published to the Pages site, unnoticed by the
 * very gate meant to catch it.
 */
export function checkAssets(html: string, previewHtml?: string): AssetAdvisory[] {
  const shippable = scan(html);
  if (previewHtml === undefined) return shippable;
  const seen = new Set(shippable.map((a) => a.src));
  const previewExtra = scan(previewHtml)
    .filter((a) => !seen.has(a.src))
    .map((a) => ({ ...a, previewOnly: true }));
  return [...shippable, ...previewExtra];
}

function scan(html: string): AssetAdvisory[] {
  const out: AssetAdvisory[] = [];

  // Section backgrounds: no render width to compare against (they cover the 600px body at whatever
  // ratio the art has), so weight is the only thing worth asserting — and it is the one that hurts.
  for (const src of backgroundImages(html)) {
    const size = readImageSize(resolve(OUT_DIR, src));
    if (!size) continue;
    const kb = size.bytes / 1024;
    if (kb <= IMAGE_WARN_KB) continue;
    const photographic = /\.png$/i.test(src) && size.width * size.height > 250_000;
    out.push({
      src,
      message: `${kb.toFixed(0)} KB (${size.width}×${size.height}) background — over the ${IMAGE_WARN_KB} KB per-image budget.${
        photographic
          ? ' It is a large PNG of a photograph; JPEG q85 is ~85% smaller with no visible difference.'
          : ''
      }`,
    });
  }

  for (const { src, width } of extractImageRefs(html)) {
    if (/^https?:\/\//i.test(src) || src.startsWith('{{')) continue; // hosted / merge-tag: not ours to measure
    const size = readImageSize(resolve(OUT_DIR, src));
    if (!size) continue; // SVG or unreadable — nothing to assert
    const kb = size.bytes / 1024;

    if (width !== null && size.width > 0 && size.width < width * RETINA_FACTOR) {
      const scale = (size.width / width).toFixed(2);
      out.push({
        src,
        message: `renders at ${width}px but the source is only ${size.width}×${size.height} (${scale}×) — soft on any HiDPI screen. Re-export at ≥${width * RETINA_FACTOR}px wide.`,
      });
    }
    if (kb > IMAGE_WARN_KB) {
      const photographic = /\.png$/i.test(src) && size.width * size.height > 250_000;
      const hint = photographic
        ? ' It is a large PNG — if it is a photograph, JPEG q85 is ~85% smaller with no visible difference.'
        : '';
      out.push({
        src,
        message: `${kb.toFixed(0)} KB (${size.width}×${size.height}) — over the ${IMAGE_WARN_KB} KB per-image budget.${hint}`,
      });
    }
  }

  return out;
}
