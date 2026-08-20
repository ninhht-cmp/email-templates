import nunjucks from 'nunjucks';
import { NUNJUCKS_TAGS, SRC_ROOT } from './config.ts';

/** Configure the Nunjucks environment used for every render (build and tests share this). */
export function createEnv(): nunjucks.Environment {
  const env = nunjucks.configure(SRC_ROOT, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
    noCache: true,
    tags: NUNJUCKS_TAGS,
  });

  // `mw(pct, contentWidth)` → the fluid-hybrid column class `mw-<px>`, where px is the column's
  // desktop box width = pct% × contentWidth (contentWidth = 600 − 2×section horizontal padding).
  // This DERIVES the max-width instead of hand-typing it (was the audit's H2 magic-number risk):
  // it stays in sync with the column's width%/padding and matches MJML's own ghost-table px exactly.
  // See applyFluidMaxWidth (build/html-transforms.ts) and docs/architecture.md §9.
  env.addGlobal(
    'mw',
    (pct: number, contentWidth: number) => `mw-${Math.round((pct / 100) * contentWidth)}`,
  );

  return env;
}
