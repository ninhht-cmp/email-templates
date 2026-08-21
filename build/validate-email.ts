import { extractMergeKeys } from './analyze.ts';
import { BREAKPOINT_PX } from './config.ts';
import { collectBreakpoints, type FluidResult } from './html-transforms.ts';
import { type EmailMeta, emailMetaSchema } from './schema.ts';

/** Validate `meta.ts` against the uniform contract. Throws (with a readable message) on mismatch. */
export function validateMeta(rawMeta: unknown, emailName: string): EmailMeta {
  const result = emailMetaSchema.safeParse(rawMeta);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`meta.ts invalid for "${emailName}":\n   - ${issues.join('\n   - ')}`);
  }
  return result.data;
}

/**
 * Non-fatal compliance advisories for `meta.ts`. A marketing email with no `adLabel` isn't an error
 * (a global/international audience may not require one), but we surface it so the omission is always
 * a conscious choice — never a silent one — for any campaign that does reach a jurisdiction requiring
 * an advertising label (e.g. VN Nghị định 91).
 */
export function metaAdvisories(meta: EmailMeta): string[] {
  if (meta.category === 'marketing' && !meta.adLabel) {
    return [
      'marketing email has no meta.adLabel — confirm the audience needs no advertising label. Set adLabel ("[QC]"/"[AD]") for VN-facing campaigns (NĐ91), or let the sending system prepend a per-segment label.',
    ];
  }
  return [];
}

/**
 * A marketing email MUST carry an opt-out. Not a style rule — CAN-SPAM, GDPR and NĐ91 all require
 * one, and the failure is silent in every other check: the unsubscribe clause is wrapped in
 * `{{#if unsubscribe}}` so the sending system can drop it, and deleting blocks/footer.njk from a
 * section registry would remove it with nothing going red. This makes "a marketing send has a way
 * out" a build invariant instead of a thing someone has to remember.
 *
 * Transactional / lifecycle mail is exempt: it is not an advertisement and (for transactional) an
 * unsubscribe link would be wrong.
 */
export function requireOptOut(meta: EmailMeta, html: string): string[] {
  if (meta.category !== 'marketing') return [];
  const errors: string[] = [];
  if (!meta.requiredKeys.includes('unsubscribe')) {
    errors.push(
      'marketing email must declare "unsubscribe" in meta.requiredKeys — a marketing send needs an opt-out (CAN-SPAM / GDPR / NĐ91).',
    );
  }
  if (!html.includes('{{unsubscribe}}')) {
    errors.push(
      'marketing email renders no {{unsubscribe}} link — include blocks/footer.njk (or another opt-out) in the section registry.',
    );
  }
  return errors;
}

/**
 * Email has exactly TWO layout states: desktop multi-column and mobile stack. So the built HTML may
 * declare exactly ONE breakpoint — MJML's `min-width:<BREAKPOINT_PX>` (from `<mj-breakpoint>`) and
 * its mirror `max-width:<BREAKPOINT_PX − 1>` for the hand-written mobile block.
 *
 * Anything else is a real defect, in one of two directions:
 *   · a third width  → web-CSS sm/md/lg thinking, i.e. per-device tuning that no email client
 *                      grid actually needs and that Outlook desktop never reads anyway;
 *   · a mismatch     → the `<mj-breakpoint>` and the `max-width` block have drifted apart, leaving
 *                      a 1px band (or worse, an overlap) where neither state applies.
 * Fails the build, because both are invisible until someone opens the mail on the wrong phone.
 */
export function assertSingleBreakpoint(html: string): string[] {
  const { min, max } = collectBreakpoints(html);
  const errors: string[] = [];

  if (min.join() !== String(BREAKPOINT_PX)) {
    errors.push(
      `expected exactly one min-width breakpoint (${BREAKPOINT_PX}px, from <mj-breakpoint>), found: ${min.join(', ') || 'none'}. Email needs one breakpoint, not a scale.`,
    );
  }
  if (max.length > 1 || (max.length === 1 && max[0] !== BREAKPOINT_PX - 1)) {
    errors.push(
      `expected at most one max-width mobile block (${BREAKPOINT_PX - 1}px = BREAKPOINT_PX − 1), found: ${max.join(', ')}. Fold extra widths into the single mobile block in design-system/head.njk.`,
    );
  }
  return errors;
}

/**
 * Every column the template marked `fluid` must have come out with an inline max-width. If MJML's
 * output shape ever changes, applyFluidMaxWidth would silently inject nothing — and the damage
 * (columns stacking on desktop) only appears in New Outlook and Gmail-GANGA, i.e. exactly where no
 * local preview looks. Cheap assertion, expensive failure.
 */
export function assertFluidInjected(fluid: FluidResult): string[] {
  if (fluid.marked === fluid.injected) return [];
  return [
    `${fluid.marked - fluid.injected} of ${fluid.marked} css-class="fluid" column(s) got no inline max-width — applyFluidMaxWidth could not read MJML's ghost-table width. Those columns will stack on desktop in New Outlook / Gmail-GANGA. Check build/html-transforms.ts against the current MJML output.`,
  ];
}

/**
 * Reconcile the merge keys actually rendered against `meta.requiredKeys`.
 * Returns errors (fail the build) and warnings (informational).
 */
export function reconcileMergeKeys(
  html: string,
  requiredKeys: string[],
): { errors: string[]; warnings: string[] } {
  const rendered = extractMergeKeys(html).map((key) => key.replace(/[{}]/g, ''));
  const declared = new Set(requiredKeys);
  const renderedSet = new Set(rendered);

  const undeclared = rendered.filter((key) => !declared.has(key));
  const unused = requiredKeys.filter((key) => !renderedSet.has(key));

  const errors = undeclared.length
    ? [`merge keys used but not declared in meta.requiredKeys: ${undeclared.join(', ')}`]
    : [];
  const warnings = unused.length ? [`declared keys never rendered: ${unused.join(', ')}`] : [];
  return { errors, warnings };
}
