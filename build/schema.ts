// Zod schemas = the single source of truth for the build's data contracts.
// Types are inferred from the schemas, so the runtime check and the static type never drift.
import { z } from 'zod';

/** Uniform build/ops contract every email must satisfy (`meta.ts`). */
export const emailMetaSchema = z.object({
  category: z.enum(['marketing', 'transactional', 'lifecycle']),
  subject: z.string().min(1),
  requiredKeys: z.array(z.string()),
  // Per-email sample values for the preview build (override/extend the shared defaults).
  previewSamples: z.record(z.string(), z.string()).optional(),
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
