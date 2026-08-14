// Shape contract for the buyer-invitation email. Kept separate from the data (content.ts) so the
// schema can be reviewed independently; the inferred type documents the content model.
import { z } from 'zod';
import { companySchema, complianceSchema } from '../../blocks/shared-content.schema.ts';

export const contentSchema = z.object({
  document: z.object({ title: z.string(), preview: z.string() }),

  assets: z.object({
    logo: z.string(),
    /** Hero composite: browser mock + "Comacpro.net" pill, pre-flattened (see README). */
    heroBrowser: z.string(),
    avatar: z.string(),
    whatsappIcon: z.string(),
    emailIcon: z.string(),
  }),

  hero: z.object({ heading: z.string(), subline: z.string() }),

  /**
   * Market chips — `flag` is a hosted flag image, `label` the market name.
   * `focus` shifts the circular crop when the flag's emblem is off-centre (CSS object-position).
   */
  markets: z.array(
    z.object({ flag: z.string(), label: z.string(), focus: z.string().optional() }),
  ),

  /** Headline proof numbers: value + caption (no icon — the proof panel dropped the discs). */
  stats: z.array(z.object({ value: z.string(), label: z.string() })),

  /** Inset benefit strip: orange line icon + short uppercase title. */
  benefits: z.array(z.object({ icon: z.string(), title: z.string() })),

  /** The two CTA button labels; their links are separate merge keys. */
  ctas: z.object({ primary: z.string(), secondary: z.string() }),

  // Shared footer blocks (same every campaign) — shape defined once in shared-content.schema.ts.
  company: companySchema,
  compliance: complianceSchema,
});

export type BuyerInvitationContent = z.infer<typeof contentSchema>;
