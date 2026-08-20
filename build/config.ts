// Build-wide constants. Single place to tune paths and thresholds.

/** Nunjucks resolves includes/imports relative to this root. */
export const SRC_ROOT = 'src';

/** One folder per email lives here (colocation). */
export const EMAILS_DIR = 'src/emails';

/** Compiled HTML + preview gallery are written here. */
export const OUT_DIR = 'dist';

/**
 * Nunjucks variable delimiters are remapped to `{$ … $}` so that `{{ … }}` merge
 * tags pass through the build untouched for the sending system to fill.
 */
export const NUNJUCKS_TAGS = { variableStart: '{$', variableEnd: '$}' } as const;

/** Gmail clips messages larger than ~102 KB. */
export const GMAIL_CLIP_KB = 102;

/**
 * Asset hosts allowed in a shippable email. Any image on another host — a `*.dev` / staging CDN
 * especially — is flagged by the build (see findUnhostedAssets) so a non-prod asset URL can't ship
 * silently. Add a host here only once it's a real production CDN.
 */
export const PROD_ASSET_HOSTS: readonly string[] = ['storage.comacpro.net', 'flagcdn.com'];
