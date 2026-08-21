// Post-render HTML transforms — pure string → string. They run on MJML's (controlled) output, so a
// regex approach is safe and dependency-free; keeping them here (not in render-email) isolates the
// "mutate the built HTML" concern from "render MJML". Unit-tested in test/build.test.ts.

/** Read one HTML attribute out of a start tag. */
function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? (m[1] ?? null) : null;
}

/** True when the tag's class list contains `name` as a WHOLE token (`fluid` ≠ `fluid-outlook`). */
function hasClass(tag: string, name: string): boolean {
  return attr(tag, 'class')?.split(/\s+/).includes(name) ?? false;
}

export interface FluidResult {
  html: string;
  /** Columns marked `fluid` in the template. */
  marked: number;
  /** Columns that actually received an inline max-width. Must equal `marked`. */
  injected: number;
}

/**
 * Fluid-hybrid columns — the mechanism that keeps multi-column sections side-by-side in clients
 * that throw away `<style>` (and with it MJML's `min-width` breakpoint rule): New Outlook /
 * Outlook webview and Gmail on a non-Google account (GANGA). There the column keeps MJML's inline
 * `width:100%`, so without help it stacks even on a desktop-width viewport.
 *
 * The fix is an INLINE `max-width` — no media query, so it survives everywhere: a wide viewport
 * puts the columns side-by-side, a narrow one reflows. MJML can't emit it (mj-style inline drops
 * max-width), so it is injected here.
 *
 * WHERE THE NUMBER COMES FROM: MJML already computes each column's desktop box width and writes it
 * into the Outlook ghost table it emits right before the column div
 * (`<td … style="…width:252px;">`). We read THAT and mirror it. So the template only declares
 * INTENT — `css-class="fluid"`, no number — and the pixel value is derived from MJML's own layout
 * pass. Nothing to keep in sync with section padding, no magic constant, and nothing for Nunjucks
 * to compute: change a padding and the ghost width moves, so the max-width moves with it.
 *
 * `marked`/`injected` let the caller fail the build if MJML's output shape ever changes and a
 * marked column silently misses its max-width — the failure mode is invisible in a browser preview
 * and only shows up in the two clients this exists for. See docs/architecture.md §9.
 */
export function applyFluidMaxWidth(html: string): FluidResult {
  let marked = 0;
  let injected = 0;
  let pendingWidth: string | null = null;

  const out = html.replace(/<(?:td|div)\b[^>]*>/g, (tag) => {
    // MJML suffixes every css-class with `-outlook` on the ghost-table cell.
    if (hasClass(tag, 'fluid-outlook')) {
      pendingWidth = /(?<![-\w])width:(\d+)px/.exec(attr(tag, 'style') ?? '')?.[1] ?? null;
      return tag;
    }
    if (!hasClass(tag, 'fluid')) return tag;

    marked++;
    const width = pendingWidth;
    pendingWidth = null;
    if (width === null || !tag.includes('style="')) return tag;
    injected++;
    return tag.replace('style="', `style="max-width:${width}px;`);
  });

  return { html: out, marked, injected };
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

/**
 * Every distinct breakpoint the built HTML declares, as `min-width`/`max-width` px values found in
 * `@media` conditions. Email needs exactly two states — desktop multi-column and mobile stack — so
 * this should only ever report THE breakpoint (`min-width:480`) and its mirror (`max-width:479`).
 * A third value means someone brought web-CSS multi-breakpoint thinking in. See
 * assertSingleBreakpoint (validate-email.ts).
 */
export function collectBreakpoints(html: string): { min: number[]; max: number[] } {
  const min = new Set<number>();
  const max = new Set<number>();
  for (const [, kind, px] of html.matchAll(/\((min|max)-width\s*:\s*(\d+)px\)/g)) {
    (kind === 'min' ? min : max).add(Number(px));
  }
  return { min: [...min].sort((a, b) => a - b), max: [...max].sort((a, b) => a - b) };
}
