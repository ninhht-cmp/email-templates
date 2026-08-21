// Read-only analysis of built HTML — extract facts, never mutate. Feeds the build's governance
// gates (merge-key reconciliation, asset-hosting checks). Unit-tested in test/build.test.ts.

/**
 * Merge keys actually present in built HTML — used for key governance. Covers BOTH forms the
 * sending system sees:
 *   · `{{key}}`        — a value substitution
 *   · `{{#if key}}`    — a conditional block (the key still has to exist in the sending system, and
 *                        a key used ONLY as a condition used to slip past this check entirely)
 * `{{/if}}` and other block closers are not keys and are excluded by the `[a-z0-9_]` charset.
 */
export function extractMergeKeys(html: string): string[] {
  const values = html.match(/\{\{\s*[a-z0-9_]+\s*\}\}/gi) ?? [];
  const conditions = [...html.matchAll(/\{\{#if\s+([a-z0-9_]+)\s*\}\}/gi)].map(
    (m) => `{{${m[1]}}}`,
  );
  return [...new Set([...values.map((key) => key.replace(/\s/g, '')), ...conditions])].sort();
}

/**
 * Assets that will NOT load (or should not) in a real inbox: repo-relative paths, placehold.co
 * stand-ins, and — critically — images hosted on any non-prod host (a `*.dev` / staging CDN). The
 * last catches dev asset URLs that would otherwise ship silently; `prodHosts` is the allowlist.
 */
export function findUnhostedAssets(
  html: string,
  prodHosts: readonly string[],
): { relative: string[]; placeholder: string[]; nonProd: string[] } {
  const relative = [...new Set(html.match(/\.\.\/[^"')]+\.(?:png|jpe?g|gif|svg|webp)/gi) ?? [])];
  const placeholder = [...new Set(html.match(/https?:\/\/placehold\.co\/[^"')\s]+/gi) ?? [])];
  const hostedImages =
    html.match(/https?:\/\/[^\s"')]+\.(?:png|jpe?g|gif|svg|webp)(?:\?[^\s"')]*)?/gi) ?? [];
  const nonProd = [
    ...new Set(
      hostedImages.filter((url) => {
        const host = url.match(/^https?:\/\/([^/]+)/)?.[1] ?? '';
        return host !== '' && !prodHosts.includes(host);
      }),
    ),
  ];
  return { relative, placeholder, nonProd };
}

export interface ImageRef {
  src: string;
  /** The `width` HTML attribute in px, or null when the image is sized by CSS only. */
  width: number | null;
}

/**
 * Every `<img>` in the built HTML with its declared render width. The width ATTRIBUTE is what we
 * want (not the CSS): it is the size blocked-image clients reserve and the size Outlook renders at,
 * so it is the number a source asset has to be retina against. VML fills (`<v:fill src=…>`) are
 * skipped — they mirror an <img> that is already listed.
 */
export function extractImageRefs(html: string): ImageRef[] {
  const refs = new Map<string, ImageRef>();
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\bsrc="([^"]*)"/i.exec(tag)?.[1];
    if (!src) continue;
    const rawWidth = /\bwidth="(\d+)"/i.exec(tag)?.[1];
    const width = rawWidth === undefined ? null : Number(rawWidth);
    const existing = refs.get(src);
    // Same asset used at two sizes → keep the largest, that's the one that must be sharp.
    if (!existing || (width !== null && (existing.width ?? 0) < width))
      refs.set(src, { src, width });
  }
  return [...refs.values()];
}

/**
 * SVGs referenced from an `<img src>`. Gmail (web + app) and Outlook do not render SVG in <img> —
 * the image is simply missing, with the alt text if you are lucky. The repo keeps SVG masters on
 * purpose and previews with them, so this is not an error at build time; it IS an error in anything
 * about to be sent, which is why lint-compat.ts fails on it. See docs/email-testing.md.
 */
export function findSvgImages(html: string): string[] {
  return [
    ...new Set(
      extractImageRefs(html)
        .map((ref) => ref.src)
        .filter((src) => /\.svg(?:\?|$)/i.test(src)),
    ),
  ];
}
