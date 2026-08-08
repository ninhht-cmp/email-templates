// Shape contract for the buyer-invitation email. SCAFFOLD — expand once the design is provided.
import { z } from 'zod';

export const contentSchema = z.object({
  document: z.object({ title: z.string(), preview: z.string() }),

  // Assets needed by the shared signature block. Add hero/section images here from the design.
  assets: z.object({
    avatar: z.string(),
    whatsappIcon: z.string(),
    emailIcon: z.string(),
  }),

  // TODO(design): replace `placeholder` with the real body fields (hero, features, CTA, …).
  placeholder: z.object({ note: z.string() }),

  company: z.object({
    legalName: z.string(),
    uen: z.string(),
    offices: z.array(
      z.object({ badge: z.string(), tone: z.enum(['solid', 'gray']), address: z.string() }),
    ),
  }),
});

export type BuyerInvitationContent = z.infer<typeof contentSchema>;
