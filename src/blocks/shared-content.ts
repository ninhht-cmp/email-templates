// Content for the SHARED blocks in this folder. It is identical in every campaign, so it lives
// here once instead of being copy-pasted into each email's content.ts — change an office address
// and every email picks it up on the next build.
//
// Each email still spreads it into its own `contentSchema.parse({...})`, so the shape is validated
// per email and an email remains free to override it.

/** Fixed legal facts rendered by blocks/company-legal.njk — never change per campaign. */
export const company = {
  legalName: 'COMACPRO GLOBAL PTE. LTD.',
  uen: '202630381C',
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
