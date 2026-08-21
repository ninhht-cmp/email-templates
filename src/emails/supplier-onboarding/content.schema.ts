// Shape contract for this email's content. Kept separate from the data (content.ts) so the
// schema can be reviewed/reused independently. The inferred type documents the content model.
import { z } from 'zod';
import {
  companySchema,
  complianceSchema,
  sharedAssetsSchema,
} from '../../blocks/shared-content.schema.ts';

export const contentSchema = z.object({
  document: z.object({ title: z.string(), preview: z.string() }),
  // Brand logo + signature icons come from sharedAssetsSchema; the rest is this email's own art.
  assets: sharedAssetsSchema.extend({
    hero: z.string(),
    avatar: z.string(),
  }),
  hero: z.object({ heading: z.string(), subline: z.string() }),
  features: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string() })),
  reassurance: z.object({ icon: z.string(), text: z.string() }),
  equipment: z.array(z.object({ img: z.string(), label: z.string() })),
  // Shared footer blocks (same every campaign) — shape defined once in shared-content.schema.ts.
  company: companySchema,
  compliance: complianceSchema,
});

export type SupplierOnboardingContent = z.infer<typeof contentSchema>;
