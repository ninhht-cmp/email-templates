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

const ICONS = "../src/emails/supplier-onboarding/assets/icons";

export const content: SupplierOnboardingContent = contentSchema.parse({
  document: {
    title:
      "Reach qualified construction equipment buyers across Southeast Asia",
    // Inbox preheader (shown after the subject). Static text — reliable in every sending system.
    // (A {{preview_text}} merge tag needs the engine to support it; the Mustache-fallback version
    //  broke because the engine only does simple {{key}} replacement, not sections.)
    preview:
      "No listing fee. Reach qualified buyers across Southeast Asia — we prepare your listings.",
  },

  assets: {
    logo: "../src/emails/supplier-onboarding/assets/comacpro-logo.png",
    // Raw machinery photo (2:1); the light left gradient is a CSS layer in the entry head.
    hero: "../src/emails/supplier-onboarding/assets/comacpro-machinery.png",
    avatar: "{{sender_avatar}}", // per-sender, filled at send time
    whatsappIcon: `${ICONS}/whatsapp.svg`,
    emailIcon: `${ICONS}/email.svg`,
  },

  hero: {
    heading:
      "Reach qualified construction equipment buyers across Southeast Asia",
    // "COMACPRO" is emphasised in orange via the {brand} marker, replaced in the template.
    subline:
      "Launch your {brand} supplier store with dedicated onboarding and listing support.",
  },

  // icon = plain icon image (the pastel chip is a CSS container in the template).
  features: [
    {
      icon: `${ICONS}/no-fee.svg`,
      title: "No listing fee",
      desc: "Showcase your inventory with no upfront listing cost.",
    },
    {
      icon: `${ICONS}/buyers.svg`,
      title: "Qualified buyers",
      desc: "Reach contractors, dealers and importers across Vietnam and Southeast Asia.",
    },
    {
      icon: `${ICONS}/sync.svg`,
      title: "Easy sync",
      desc: "We can prepare product listings from your existing website, catalog or inventory file.",
    },
    {
      icon: `${ICONS}/support.svg`,
      title: "Dedicated support",
      desc: "Get help with onboarding, listing optimization and buyer inquiries.",
    },
  ],

  reassurance: {
    icon: `${ICONS}/shield.svg`,
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

  company: {
    // Fixed legal facts — static (never change per campaign).
    legalName: "COMACPRO GLOBAL PTE. LTD.",
    uen: "202630381C",
    offices: [
      {
        badge: "Head Office",
        tone: "solid",
        address: "7500A Beach Road #04-326, The Plaza Singapore 199591",
      },
      {
        badge: "Vietnam Office",
        tone: "gray",
        address:
          "ACCI Building 210 Le Trong Tan St., Phuong Liet, Hanoi, Vietnam",
      },
    ],
  },
});
