// Content for the supplier-onboarding email. Parsed through contentSchema at import, so a
// wrong shape (missing field, wrong type) fails the build with a clear message.
//
// EVERY image is a URL in one place (here). For local preview they are repo-relative; before
// sending, host them and replace with absolute HTTPS URLs (the build lists any still-temporary
// URL). Send-time {{merge_tags}} stay inline.

// Content for the shared legal-footer block — same in every campaign.
import { company, compliance } from '../../blocks/shared-content.ts';
import { contentSchema, type SupplierOnboardingContent } from './content.schema.ts';

export const content: SupplierOnboardingContent = contentSchema.parse({
  document: {
    title: 'Reach qualified construction equipment buyers across Southeast Asia',
    preview:
      'No listing fee. Reach qualified buyers across Southeast Asia — we prepare your listings.',
  },

  assets: {
    logo: '../src/emails/supplier-onboarding/assets/comacpro-logo.png',
    // Single wash-baked asset used for EVERY client and width — Gmail ignores CSS background-image
    // swaps, so a per-width swap can't be relied on; the wash keeps text legible full-width. See hero.njk.
    hero: '../src/emails/supplier-onboarding/assets/comacpro-machinery.png',
    avatar: '{{sender_avatar}}', // per-sender, filled at send time
    whatsappIcon: `../src/emails/supplier-onboarding/assets/icons/whatsapp.svg`,
    emailIcon: `../src/emails/supplier-onboarding/assets/icons/email.svg`,
  },

  hero: {
    heading: 'Reach qualified construction equipment buyers across Southeast Asia',
    subline: 'Launch your {brand} supplier store with dedicated onboarding and listing support.',
  },

  // icon = plain icon image (the pastel chip is a CSS container in the template).
  features: [
    {
      icon: `../src/emails/supplier-onboarding/assets/icons/no-fee.svg`,
      title: 'No listing fee',
      desc: 'Showcase your inventory with no upfront listing cost.',
    },
    {
      icon: `../src/emails/supplier-onboarding/assets/icons/buyers.svg`,
      title: 'Qualified buyers',
      desc: 'Reach contractors, dealers and importers across Vietnam and Southeast Asia.',
    },
    {
      icon: `../src/emails/supplier-onboarding/assets/icons/sync.svg`,
      title: 'Easy sync',
      desc: 'We can prepare product listings from your existing website, catalog or inventory file.',
    },
    {
      icon: `../src/emails/supplier-onboarding/assets/icons/support.svg`,
      title: 'Dedicated support',
      desc: 'Get help with onboarding, listing optimization and buyer inquiries.',
    },
  ],

  reassurance: {
    icon: `../src/emails/supplier-onboarding/assets/icons/shield.svg`,
    text: 'Your current sales channels stay unchanged.',
  },

  equipment: [
    {
      img: 'https://storage.comacpro.net/global-assets/categories/earthmoving-equipment/excavator.png?w=64&q=75',
      label: 'Excavators',
    },
    {
      img: 'https://storage.comacpro.net/global-assets/categories/lifting-equipment/mobile-crane.png?w=64&q=75',
      label: 'Cranes',
    },
    {
      img: 'https://storage.comacpro.net/global-assets/categories/earthmoving-equipment/wheel-loader.png?w=64&q=75',
      label: 'Wheel loaders',
    },
    {
      img: 'https://storage.comacpro.net/global-assets/categories/earthmoving-equipment/wheel-bulldozer.png?w=64&q=75',
      label: 'Bulldozers',
    },
    {
      img: 'https://storage.comacpro.net/global-assets/categories/material-handling/forklift.png?w=64&q=75',
      label: 'Forklifts',
    },
    {
      img: 'https://storage.comacpro.net/global-assets/categories/accessories-spare-parts/material-handling-accessories-spare-parts.png?w=64&q=75',
      label: 'Spare parts & more',
    },
  ],

  company,
  compliance,
});
