// Content for the supplier-onboarding email. Parsed through contentSchema at import, so a
// wrong shape (missing field, wrong type) fails the build with a clear message.
//
// EVERY image is a URL in one place (here). For local preview they are repo-relative; before
// sending, host them and replace with absolute HTTPS URLs (the build lists any still-temporary
// URL). Send-time {{merge_tags}} stay inline.
import {
  contentSchema,
  type SupplierOnboardingContent,
} from "./content.schema.ts";
// Content for the shared legal-footer block — same in every campaign.
import { company } from "../../blocks/shared-content.ts";

const ICONS = "../src/emails/supplier-onboarding/assets/icons";

export const content: SupplierOnboardingContent = contentSchema.parse({
  document: {
    title:
      "Reach qualified construction equipment buyers across Southeast Asia",
    preview:
      "No listing fee. Reach qualified buyers across Southeast Asia — we prepare your listings.",
  },

  assets: {
    logo: "https://storage.dev.cmpup.com/global-statics/marketing/assets/comacpro-logo-qKnF2nRg-1786604844566.webp",
    hero: "https://storage.dev.cmpup.com/global-statics/marketing/assets/comacpro-machinery-D7bX02DP-1786604328309.webp",
    heroMobile:
      "https://storage.dev.cmpup.com/global-statics/marketing/assets/comacpro-machinery-mobile-16jl6Buv-1786610865276.webp",
    avatar: "{{sender_avatar}}", // per-sender, filled at send time
    whatsappIcon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/whatsapp-F2v5jPMj-1786604562320.webp`,
    emailIcon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/email-9jnI2dXw-1786604531986.webp`,
  },

  hero: {
    heading:
      "Reach qualified construction equipment buyers across Southeast Asia",
    subline:
      "Launch your {brand} supplier store with dedicated onboarding and listing support.",
  },

  // icon = plain icon image (the pastel chip is a CSS container in the template).
  features: [
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/no-fee-OvDYxeUR-1786603849258.webp`,
      title: "No listing fee",
      desc: "Showcase your inventory with no upfront listing cost.",
    },
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/buyers-rAjqn9sb-1786604021401.webp`,
      title: "Qualified buyers",
      desc: "Reach contractors, dealers and importers across Vietnam and Southeast Asia.",
    },
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/sync-9D4aIGlY-1786604063608.webp`,
      title: "Easy sync",
      desc: "We can prepare product listings from your existing website, catalog or inventory file.",
    },
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/support-NHP7BHzy-1786604092504.webp`,
      title: "Dedicated support",
      desc: "Get help with onboarding, listing optimization and buyer inquiries.",
    },
  ],

  reassurance: {
    icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/shield-HK2ti3iE-1786604467393.webp`,
    text: "Your current sales channels stay unchanged.",
  },

  equipment: [
    {
      img: "https://storage.comacpro.net/global-assets/categories/earthmoving-equipment/excavator.png?w=64&q=75",
      label: "Excavators",
    },
    {
      img: "https://storage.comacpro.net/global-assets/categories/lifting-equipment/mobile-crane.png?w=64&q=75",
      label: "Cranes",
    },
    {
      img: "https://storage.comacpro.net/global-assets/categories/earthmoving-equipment/wheel-loader.png?w=64&q=75",
      label: "Wheel loaders",
    },
    {
      img: "https://storage.comacpro.net/global-assets/categories/earthmoving-equipment/wheel-bulldozer.png?w=64&q=75",
      label: "Bulldozers",
    },
    {
      img: "https://storage.comacpro.net/global-assets/categories/material-handling/forklift.png?w=64&q=75",
      label: "Forklifts",
    },
    {
      img: "https://storage.comacpro.net/global-assets/categories/accessories-spare-parts/material-handling-accessories-spare-parts.png?w=64&q=75",
      label: "Spare parts & more",
    },
  ],

  company,
});
