import nunjucks from 'nunjucks';
import { NUNJUCKS_TAGS, SRC_ROOT } from './config.ts';

/**
 * Configure the Nunjucks environment used for every render (build and tests share this).
 *
 * Nunjucks' job here is CONTENT ONLY — inject copy, asset URLs, and loop over item lists. It owns
 * no layout and no responsive logic: stacking is MJML's `<mj-breakpoint>` at compile time, and the
 * fluid-hybrid `max-width` is derived from MJML's own output afterwards (see applyFluidMaxWidth).
 * There are deliberately NO layout globals/filters registered — a template that needs a pixel
 * value computed is a template doing MJML's job.
 */
export function createEnv(): nunjucks.Environment {
  return nunjucks.configure(SRC_ROOT, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
    noCache: true,
    tags: NUNJUCKS_TAGS,
  });
}
