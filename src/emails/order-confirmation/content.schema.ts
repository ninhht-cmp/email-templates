// Shape contract for the order-confirmation email. Kept separate from the data (content.ts) so the
// schema can be reviewed independently; the inferred type documents the content model.
import { z } from 'zod';
import {
  companySchema,
  complianceSchema,
  sharedAssetsSchema,
} from '../../blocks/shared-content.schema.ts';

export const contentSchema = z.object({
  document: z.object({ title: z.string(), preview: z.string() }),

  // Only the shared brand/signature assets — this template ships no art of its own on purpose, so
  // it renders correctly offline and needs nothing hosted before you can look at it.
  assets: sharedAssetsSchema,

  headline: z.object({ title: z.string(), subline: z.string() }),

  /**
   * The order facts, as a label/value list rendered two-across. `key` is the merge key the sending
   * system fills — the LABEL is content (translatable, ours) while the VALUE is per-recipient data,
   * which is the split the rest of the repo uses everywhere.
   */
  orderFacts: z.array(z.object({ label: z.string(), key: z.string() })),

  /**
   * Sample line items, looped by Nunjucks at BUILD time so the preview shows a realistic table.
   * A real send replaces this block with the sending system's own repeat syntax — see items.njk.
   */
  lineItems: z.array(z.object({ name: z.string(), qty: z.string(), price: z.string() })),

  totals: z.array(z.object({ label: z.string(), value: z.string(), strong: z.boolean() })),

  /** "What happens next" steps — a 4-across strip on desktop, 2-across on mobile. */
  nextSteps: z.array(z.object({ step: z.string(), title: z.string(), desc: z.string() })),

  support: z.object({ text: z.string(), cta: z.string() }),

  // Shared footer blocks (same every campaign) — shape defined once in shared-content.schema.ts.
  company: companySchema,
  compliance: complianceSchema,
});

export type OrderConfirmationContent = z.infer<typeof contentSchema>;
