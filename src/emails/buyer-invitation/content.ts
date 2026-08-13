// Content for the buyer-invitation email. Parsed through contentSchema at import, so a wrong
// shape (missing field, wrong type) fails the build with a clear message.
//
// EVERY image is a URL in one place (here). For local preview they are repo-relative; before
// sending, host them and replace with absolute HTTPS URLs (the build lists any still-temporary
// URL after each run). Send-time {{merge_tags}} stay inline.
import {
  contentSchema,
  type BuyerInvitationContent,
} from "./content.schema.ts";
// Content for the shared legal footer block — same in every campaign.
import { company } from "../../blocks/shared-content.ts";

const ASSETS = "../src/emails/buyer-invitation/assets";
const ICONS = `${ASSETS}/icons`;
// Flags come straight from flagcdn (already hosted — nothing to upload). `h40` is 60×40, i.e. 2×
// for the 20×20 badge, so it stays crisp on retina. The circle is CSS (see sections/markets.njk).
const FLAG = "https://flagcdn.com/h40";

export const content: BuyerInvitationContent = contentSchema.parse({
  document: {
    title:
      "Find reliable used construction equipment for your upcoming projects",
    // Inbox preheader (shown after the subject). Static text — reliable in every sending system.
    preview:
      "200,000+ listings from 10,000+ verified suppliers across Japan, China, Korea, the EU and Vietnam.",
  },

  assets: {
    logo: `https://storage.dev.cmpup.com/global-statics/marketing/assets/comacpro-logo-qKnF2nRg-1786604844566.webp`,
    heroBrowser: `https://storage.dev.cmpup.com/global-statics/marketing/assets/hero-browser-gNe6cERE-1786605448346.webp`,
    avatar: "{{sender_avatar}}", // per-sender, filled at send time
    whatsappIcon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/whatsapp-F2v5jPMj-1786604562320.webp`,
    emailIcon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/email-9jnI2dXw-1786604531986.webp`,
  },

  hero: {
    heading: "Find Reliable Used<br />Construction Equipment",
    subline: "For your upcoming projects",
  },

  markets: [
    { flag: `${FLAG}/jp.png`, label: "Japan" },
    { flag: `${FLAG}/cn.png`, label: "China", focus: "left" },
    { flag: `${FLAG}/kr.png`, label: "South Korea" },
    { flag: `${FLAG}/eu.png`, label: "European Union" },
    { flag: `${FLAG}/vn.png`, label: "Vietnam" },
    {
      flag: `https://storage.dev.cmpup.com/global-statics/marketing/assets/global-I6LwYp1O-1786606263153.webp`,
      label: "Global market",
    },
  ],

  // Thousands separator is a COMMA: the copy is English, where "10.000+" reads as ten-point-zero.
  // No `icon`: the proof panel renders numbers + labels only (the orange discs were dropped).
  stats: [
    {
      value: "200,000+",
      label: "EQUIPMENT LISTINGS",
    },
    {
      value: "10,000+",
      label: "VERIFIED SUPPLIERS",
    },
  ],

  benefits: [
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/find-devti0dX-1786606154467.webp`,
      title: "FIND THE RIGHT MACHINE FAST",
    },
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/shipping-z5fJa9mp-1786606187296.webp`,
      title: "GLOBAL SHIPPING SUPPORT",
    },
    {
      icon: `https://storage.dev.cmpup.com/global-statics/marketing/assets/assistance-dRDdRFtY-1786606117526.webp`,
      title: "DEDICATED BUYER ASSISTANCE",
    },
  ],

  // Labels are content; each button's link is its own merge key (see meta.requiredKeys), so
  // tracking / which one counts as THE CTA is configured in the sending system.
  ctas: {
    primary: "EXPLORE EQUIPMENT",
    secondary: "REGISTER FREE",
  },

  company,
});
