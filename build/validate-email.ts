import { emailMetaSchema, type EmailMeta } from './schema.ts';
import { extractMergeKeys } from './render-email.ts';

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
