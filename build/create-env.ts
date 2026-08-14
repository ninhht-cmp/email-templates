import nunjucks from 'nunjucks';
import { NUNJUCKS_TAGS, SRC_ROOT } from './config.ts';

/** Configure the Nunjucks environment used for every render (build and tests share this). */
export function createEnv(): nunjucks.Environment {
  return nunjucks.configure(SRC_ROOT, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
    noCache: true,
    tags: NUNJUCKS_TAGS,
  });
}
