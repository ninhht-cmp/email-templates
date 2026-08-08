// Content for the buyer-invitation email. SCAFFOLD — placeholder body until the design lands.
// Every image is a URL here; swap the placeholders for hosted HTTPS URLs before sending.
import { contentSchema, type BuyerInvitationContent } from './content.schema.ts';

export const content: BuyerInvitationContent = contentSchema.parse({
  document: {
    title: 'Buyer invitation — COMACPRO', // TODO(design): final title
    // Static preheader — reliable in every sending system (no Mustache sections).
    preview: 'You are invited to source construction equipment on COMACPRO.',
  },

  assets: {
    avatar: '{{sender_avatar}}', // per-sender, filled at send time
    whatsappIcon: 'https://placehold.co/30x30/FFFFFF/25D366?text=W',
    emailIcon: 'https://placehold.co/30x30/FFFFFF/F37134?text=@',
  },

  placeholder: {
    note: 'buyer-invitation is scaffolded — the body will be implemented from the design.',
  },

  company: {
    legalName: 'COMACPRO GLOBAL PTE. LTD.',
    uen: '202630381C',
    offices: [
      { badge: 'Head Office', tone: 'solid', address: '7500A Beach Road #04-326, The Plaza Singapore 199591' },
      { badge: 'Vietnam Office', tone: 'gray', address: 'ACCI Building 210 Le Trong Tan St., Phuong Liet, Hanoi, Vietnam' },
    ],
  },
});
