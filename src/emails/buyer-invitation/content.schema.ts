// Shape contract for the buyer-invitation email. Kept separate from the data (content.ts) so the
// schema can be reviewed independently; the inferred type documents the content model.
import { z } from 'zod';

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

  // --- consumed by the shared blocks (src/blocks/) ---
  company: z.object({
    legalName: z.string(),
    uen: z.string(),
    offices: z.array(
      z.object({ badge: z.string(), tone: z.enum(['solid', 'gray']), address: z.string() }),
    ),
  }),
});

export type BuyerInvitationContent = z.infer<typeof contentSchema>;
