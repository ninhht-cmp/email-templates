import { extractMergeKeys } from './analyze.ts';
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
