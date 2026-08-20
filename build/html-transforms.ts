// Post-render HTML transforms — pure string → string. They run on MJML's (controlled) output, so a
// regex approach is safe and dependency-free; keeping them here (not in render-email) isolates the
// "mutate the built HTML" concern from "render MJML". Unit-tested in test/build.test.ts.

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
