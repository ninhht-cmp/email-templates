// Shape contract for this email's content. Kept separate from the data (content.ts) so the
// schema can be reviewed/reused independently. The inferred type documents the content model.
import { z } from 'zod';

export const contentSchema = z.object({
  document: z.object({ title: z.string(), preview: z.string() }),
  assets: z.object({
    logo: z.string(),
    hero: z.string(),
    avatar: z.string(),
    whatsappIcon: z.string(),
    emailIcon: z.string(),
  }),
  hero: z.object({ heading: z.string(), subline: z.string() }),
  features: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string() })),
  reassurance: z.object({ icon: z.string(), text: z.string() }),
  equipment: z.array(z.object({ img: z.string(), label: z.string() })),
  company: z.object({
    legalName: z.string(),
    uen: z.string(),
    /** Advertiser website — part of the NĐ91 advertiser-identity set (name/address/website). */
    website: z.string(),
    offices: z.array(
      z.object({ badge: z.string(), tone: z.enum(['solid', 'gray']), address: z.string() }),
    ),
  }),

  // Regulatory footer disclosure (Nghị định 91/2020). Cold-sourced list → no opt-in consent exists
  // to record; this carries the source-basis text shown right before the opt-out, not a consent
  // record. Supplied by blocks/shared-content.ts (same every campaign).
  compliance: z.object({
    sourceBasis: z.string(),
  }),
});

export type SupplierOnboardingContent = z.infer<typeof contentSchema>;
