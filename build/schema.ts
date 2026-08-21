// Zod schemas = the single source of truth for the build's data contracts.
// Types are inferred from the schemas, so the runtime check and the static type never drift.
import { z } from 'zod';

/**
 * Advertising labels an email may declare (Nghị định 91/2020 Điều 18, Vietnam): the label sits at
 * the FIRST position of the subject. `[QC]` = "quảng cáo" (Vietnamese), `[AD]` = English; both are
 * legally equivalent. The label is a per-recipient / per-jurisdiction concern, so it is OPT-IN per
 * campaign (`meta.adLabel`), NOT forced on every marketing send — a global/international list is not
 * uniformly subject to the VN rule. See docs/advertising-labels.md.
 */
export const AD_LABELS = ['[QC]', '[AD]'] as const;

/** Uniform build/ops contract every email must satisfy (`meta.ts`). */
export const emailMetaSchema = z
  .object({
    category: z.enum(['marketing', 'transactional', 'lifecycle']),
    subject: z.string().min(1),
    /**
     * Advertising label to enforce at the FIRST position of the subject, for campaigns subject to a
     * labelling rule (e.g. VN NĐ91). Omit when the audience/jurisdiction doesn't require one; the
     * sending system may still prepend a per-segment label at send time. When set, the build fails
     * if the subject doesn't start with it — so a labelled campaign can't get the placement wrong.
     */
    adLabel: z.enum(AD_LABELS).optional(),
    // NOTE: there is no `colorScheme` field. Every email is light-only (design-system/head.njk pins
    // it), so there is nothing per-email to configure. It was an option no email ever set.
    requiredKeys: z.array(z.string()),
    // Per-email sample values for the preview build (override/extend the shared defaults).
    previewSamples: z.record(z.string(), z.string()).optional(),
  })
  .refine((m) => !m.adLabel || m.subject.startsWith(m.adLabel), {
    path: ['subject'],
    error:
      'when meta.adLabel is set, the subject must start with it (advertising label at position 0). Prepend it, e.g. "[QC] <subject>".',
  });
export type EmailMeta = z.infer<typeof emailMetaSchema>;

/** Brand tokens contract (`design-system/tokens.ts`). */
export const tokensSchema = z.object({
  color: z.record(z.string(), z.string()),
  font: z.object({
    stack: z.string(),
    webFontUrl: z.string().optional(),
  }),
  radius: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    pill: z.string(),
  }),
  layout: z.object({ width: z.string() }),
});
export type Tokens = z.infer<typeof tokensSchema>;
