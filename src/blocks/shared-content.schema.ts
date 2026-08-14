// Schema for the SHARED footer blocks whose data lives in shared-content.ts. Defined once and
// spread into every email's contentSchema (src/emails/*/content.schema.ts) so the validated shape
// can never drift from the shared data — the data is shared, so its contract is too.
import { z } from 'zod';

/** Fixed legal identity rendered by blocks/company-legal.njk. */
export const companySchema = z.object({
  legalName: z.string(),
  uen: z.string(),
  /** Advertiser website — part of the NĐ91 advertiser-identity set (name/address/website). */
  website: z.string(),
  offices: z.array(
    z.object({ badge: z.string(), tone: z.enum(['solid', 'gray']), address: z.string() }),
  ),
});

/**
 * Regulatory footer disclosure rendered by blocks/footer.njk. Cold-sourced list → no opt-in consent
 * exists to record; this carries the source-basis text shown right before the opt-out.
 */
export const complianceSchema = z.object({
  sourceBasis: z.string(),
});
