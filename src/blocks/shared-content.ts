// Content for the SHARED blocks in this folder. It is identical in every campaign, so it lives
// here once instead of being copy-pasted into each email's content.ts — change an office address
// and every email picks it up on the next build.
//
// Each email still spreads it into its own `contentSchema.parse({...})`, so the shape is validated
// per email and an email remains free to override it.

/**
 * Assets that are NOT per-campaign, so they live at the tier that owns them instead of being
 * copy-pasted into every email's folder (they were byte-identical duplicates before):
 *   · logo        — brand-wide, Tier 1 → src/design-system/assets/
 *   · contact icons — rendered by blocks/signature.njk, Tier 2 → src/blocks/assets/
 * Paths are relative to dist/ (where the built HTML sits), like every other asset URL.
 * An email may still override any of these in its own `assets` object.
 */
export const sharedAssets = {
  logo: '../src/design-system/assets/comacpro-logo.png',
  whatsappIcon: '../src/blocks/assets/whatsapp.svg',
  emailIcon: '../src/blocks/assets/email.svg',
};

/** Fixed legal facts rendered by blocks/company-legal.njk — never change per campaign. */
export const company = {
  legalName: 'COMACPRO GLOBAL PTE. LTD.',
  uen: '202630381C',
  // Advertiser website — part of the Nghị định 91/2020 advertiser-identity set (name/address/website).
  // TODO(legal): confirm this is the correct public advertiser site before sending.
  website: 'https://comacpro.net',
  offices: [
    {
      badge: 'Head Office',
      tone: 'solid',
      address: '7500A Beach Road #04-326, The Plaza Singapore 199591',
    },
    {
      badge: 'Vietnam Office',
      tone: 'gray',
      address: 'ACCI Building 210 Le Trong Tan St., Phuong Liet, Hanoi, Vietnam',
    },
  ],
};

// Regulatory footer text (Nghị định 91/2020), rendered by blocks/footer.njk immediately before the
// opt-out. This list is COLD-SOURCED — there is no opt-in consent to record, so this is a
// source-basis DISCLOSURE (why the recipient got the mail), NOT a consent record. Same every campaign.
export const compliance = {
  // TODO(legal): confirm the wording accurately states how the recipient's address was obtained,
  // and whether a Vietnamese-language version is required for VN recipients.
  sourceBasis:
    'You received this email because your company was identified as a construction equipment supplier.',
};
