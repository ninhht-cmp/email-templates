// Zod schemas = the single source of truth for the build's data contracts.
// Types are inferred from the schemas, so the runtime check and the static type never drift.
import { z } from 'zod';

/**
 * Nghị định 91/2020: advertising (marketing) email must carry this label at the FIRST position of
 * the subject, so the recipient sees it in the inbox. `[QC]` = "quảng cáo"; the decree also permits
 * `[AD]`. Single source of truth — switch the label here.
 * TODO(legal): confirm `[QC]` vs `[AD]` for this campaign's audience.
 */
export const AD_SUBJECT_LABEL = '[QC]';

/** Uniform build/ops contract every email must satisfy (`meta.ts`). */
export const emailMetaSchema = z
  .object({
    category: z.enum(['marketing', 'transactional', 'lifecycle']),
    subject: z.string().min(1),
    requiredKeys: z.array(z.string()),
    // Per-email sample values for the preview build (override/extend the shared defaults).
    previewSamples: z.record(z.string(), z.string()).optional(),
  })
  // Enforced here (not auto-prepended) so the label is present in the meta.ts source however the
  // sending system reads the subject — parsed value, copy-paste, or grep.
  .refine((m) => m.category !== 'marketing' || m.subject.startsWith(AD_SUBJECT_LABEL), {
    path: ['subject'],
    error: `marketing emails must start the subject with "${AD_SUBJECT_LABEL}" (Nghị định 91/2020 advertising label). Prepend it in meta.ts, e.g. "${AD_SUBJECT_LABEL} <subject>".`,
  });
export type EmailMeta = z.infer<typeof emailMetaSchema>;

/** Brand tokens contract (`design-system/tokens.ts`). */
export const tokensSchema = z.object({
  color: z.record(z.string(), z.string()),
  font: z.object({
    stack: z.string(),
    webFontUrl: z.string().optional(),
  }),
  layout: z.object({ width: z.string(), padX: z.string() }),
});
export type Tokens = z.infer<typeof tokensSchema>;
