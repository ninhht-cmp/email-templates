import mjml2html from 'mjml';
import type { Environment } from 'nunjucks';

export interface RenderContext {
  tokens: unknown;
  content: unknown;
  meta: unknown;
}

export interface RenderResult {
  html: string;
  errors: { message: string; formattedMessage?: string }[];
}

/** Render one email entry: Nunjucks -> MJML -> inline HTML (mjml2html is async in v5). */
export async function renderEmail(
  env: Environment,
  entryPath: string,
  context: RenderContext,
  options: { minify: boolean },
): Promise<RenderResult> {
  const mjmlSource = env.render(entryPath, context as object);
  return mjml2html(mjmlSource, {
    validationLevel: 'soft',
    keepComments: true, // preserve MSO conditional comments (e.g. the avatar VML for Outlook)
    minify: options.minify,
    beautify: !options.minify,
    filePath: 'src',
  });
}

/** Merge keys ({{ … }}) actually present in built HTML — used for key governance. */
export function extractMergeKeys(html: string): string[] {
  const found = html.match(/\{\{\s*[a-z0-9_]+\s*\}\}/gi) ?? [];
  return [...new Set(found.map((key) => key.replace(/\s/g, '')))].sort();
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

/**
 * Fluid-hybrid columns. MJML can't inline `max-width` (mj-style inline drops it), so inject it here:
 * a column div carrying class `mw-<px>` gets that max-width prepended to its inline style. Combined
 * with MJML's inline `width:100%`, the column is side-by-side on a wide viewport and stacks on a
 * narrow one WITHOUT a media query — so it survives clients that strip <style> (New Outlook webml,
 * Gmail on non-Google accounts). A max-width:479 rule (head.njk) removes the cap on real mobile so
 * media-query clients still stack full-width.
 *
 * The `<px>` in `mw-<px>` = round(column width% × the section's content width, i.e. 600 − 2×section
 * padding). It's a hand-set constant, so it stays coupled to the column's `width`/padding: if you
 * change either, update mw too. `npm run simulate` (build/simulate-clients.ts) is the guard — it
 * renders the media-query-stripped variant, where a wrong mw makes columns wrap or leave a gap.
 */
export function applyFluidMaxWidth(html: string): string {
  return html.replace(/<div\b([^>]*\bmw-(\d+)\b[^>]*)>/g, (full, attrs: string, px: string) =>
    attrs.includes('style="')
      ? `<div${attrs.replace('style="', `style="max-width:${px}px;`)}>`
      : full,
  );
}

/**
 * Remove every `@media { … }` block. Simulates New Outlook / Outlook webview, which drop media
 * queries (and the ghost table) — the fluid-hybrid layout must still hold via inline widths.
 */
export function stripMediaQueries(html: string): string {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const at = html.indexOf('@media', i);
    if (at < 0) return out + html.slice(i);
    out += html.slice(i, at);
    const open = html.indexOf('{', at);
    if (open < 0) return out + html.slice(at);
    let depth = 0;
    let m = open;
    for (; m < html.length; m++) {
      if (html[m] === '{') depth++;
      else if (html[m] === '}' && --depth === 0) {
        m++;
        break;
      }
    }
    i = m;
  }
  return out;
}

/** Remove every `<style>` block. Simulates Gmail on a non-Google account (GANGA), which strips them. */
export function stripStyleBlocks(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
}
