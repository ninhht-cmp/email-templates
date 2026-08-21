// Schema for the SHARED footer blocks whose data lives in shared-content.ts. Defined once and
// spread into every email's contentSchema (src/emails/*/content.schema.ts) so the validated shape
// can never drift from the shared data — the data is shared, so its contract is too.
import { z } from 'zod';

/**
 * Assets shared across emails (brand logo + the signature block's contact icons). Spread into each
 * email's own `assets` shape so every email is guaranteed to have them — blocks/signature.njk reads
 * `content.assets.whatsappIcon` / `emailIcon`, and a new email forgetting to define them used to be
 * a runtime hole rather than a contract violation.
 */
export const sharedAssetsSchema = z.object({
  logo: z.string(),
  whatsappIcon: z.string(),
  emailIcon: z.string(),
});

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
