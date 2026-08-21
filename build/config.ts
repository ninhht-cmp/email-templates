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

/**
 * THE breakpoint — one number for the whole system. Email has exactly two states:
 * desktop-multi-column and mobile-stack. There is no sm/md/lg/xl here on purpose.
 *
 * It is declared to MJML by `<mj-breakpoint width="480px" />` in design-system/head.njk (which is
 * what makes mj-column stack) and mirrored by the ONE `max-width:479px` block in the same file.
 * `assertSingleBreakpoint` (build/validate-email.ts) fails the build if the emitted HTML disagrees
 * with this value or grows a second breakpoint, so the two halves can't drift apart.
 */
export const BREAKPOINT_PX = 480;

/** Gmail clips messages larger than ~102 KB. */
export const GMAIL_CLIP_KB = 102;

/**
 * Gmail's clip limit applies to the transfer-encoded MIME body, not the file on disk. Every ESP
 * sends HTML as quoted-printable, which adds `=\r\n` soft breaks plus `=XX` escapes — ~4% for
 * mostly-ASCII markup. Sizes reported against the clip limit are multiplied by this so the margin
 * we quote is the margin the recipient actually gets.
 */
export const QP_OVERHEAD = 1.04;

/**
 * A raster asset must carry at least this many source pixels per rendered CSS pixel, or it is
 * visibly soft on the retina/HiDPI screens that read most email. 2 = the usual retina rule.
 */
export const RETINA_FACTOR = 2;

/** Per-image weight ceiling. Above this, a marketing image costs more than it earns on mobile data. */
export const IMAGE_WARN_KB = 200;

/**
 * Asset hosts allowed in a shippable email. Any image on another host — a `*.dev` / staging CDN
 * especially — is flagged by the build (see findUnhostedAssets) so a non-prod asset URL can't ship
 * silently. Add a host here only once it's a real production CDN.
 */
export const PROD_ASSET_HOSTS: readonly string[] = ['storage.comacpro.net', 'flagcdn.com'];
