// Content for the buyer-invitation email. Parsed through contentSchema at import, so a wrong
// shape (missing field, wrong type) fails the build with a clear message.
//
// EVERY image is a URL in one place (here). For local preview they are repo-relative; before
// sending, host them and replace with absolute HTTPS URLs (the build lists any still-temporary
// URL after each run). Send-time {{merge_tags}} stay inline.
import { contentSchema, type BuyerInvitationContent } from './content.schema.ts';
// Content for the shared legal footer block — same in every campaign.
import { company } from '../../blocks/shared-content.ts';

const ASSETS = '../src/emails/buyer-invitation/assets';
const ICONS = `${ASSETS}/icons`;
// Flags come straight from flagcdn (already hosted — nothing to upload). `h40` is 60×40, i.e. 2×
// for the 20×20 badge, so it stays crisp on retina. The circle is CSS (see sections/markets.njk).
const FLAG = 'https://flagcdn.com/h40';

export const content: BuyerInvitationContent = contentSchema.parse({
  document: {
    title: 'Find reliable used construction equipment for your upcoming projects',
    // Inbox preheader (shown after the subject). Static text — reliable in every sending system.
    preview:
      '200,000+ listings from 10,000+ verified suppliers across Japan, China, Korea, the EU and Vietnam.',
  },

  assets: {
    logo: `${ASSETS}/comacpro-logo.png`,
    // Browser mock + frosted "Comacpro.net" pill + cursor composited into ONE image: email clients
    // cannot overlap elements, so the overlap from the design is baked in. Vector sources kept
    // alongside (whole-browser.svg + search.svg + mouse.png) — re-composite if any changes.
    heroBrowser: `${ASSETS}/hero-browser.png`,
    avatar: '{{sender_avatar}}', // per-sender, filled at send time
    whatsappIcon: `${ASSETS}/icons/whatsapp.svg`,
    emailIcon: `${ASSETS}/icons/email.svg`,
  },

  hero: {
    // Explicit <br /> — the design breaks after "Used"; natural wrapping in a 220px column
    // would produce three ragged lines instead. Rendered raw (autoescape is off).
    heading: 'Find Reliable Used<br />Construction Equipment',
    subline: 'For your upcoming projects',
  },

  markets: [
    { flag: `${FLAG}/jp.png`, label: 'Japan' },
    // `focus: 'left'` — the PRC emblem sits in the left quarter, so a centred cover-crop cuts the
    // large star in half. Everything else reads fine centred.
    { flag: `${FLAG}/cn.png`, label: 'China', focus: 'left' },
    { flag: `${FLAG}/kr.png`, label: 'South Korea' },
    { flag: `${FLAG}/eu.png`, label: 'European Union' },
    { flag: `${FLAG}/vn.png`, label: 'Vietnam' },
    // Not a country — the globe icon stands in for "everywhere else". Already square, so the
    // cover-crop is a no-op and it lines up with the flag badges.
    { flag: `${ICONS}/global.svg`, label: 'Global market' },
  ],

  // Thousands separator is a COMMA: the copy is English, where "10.000+" reads as ten-point-zero.
  // `icon` is unused since the proof panel dropped the orange discs — kept as the design master
  // in case a future layout brings icons back to the numbers.
  stats: [
    { icon: `${ICONS}/equipment.svg`, value: '200,000+', label: 'EQUIPMENT LISTINGS' },
    { icon: `${ICONS}/verified.svg`, value: '10,000+', label: 'VERIFIED SUPPLIERS' },
  ],

  benefits: [
    { icon: `${ICONS}/find.svg`, title: 'FIND THE RIGHT MACHINE FAST' },
    { icon: `${ICONS}/shipping.svg`, title: 'GLOBAL SHIPPING SUPPORT' },
    { icon: `${ICONS}/assistance.svg`, title: 'DEDICATED BUYER ASSISTANCE' },
  ],

  // Labels are content; each button's link is its own merge key (see meta.requiredKeys), so
  // tracking / which one counts as THE CTA is configured in the sending system.
  ctas: {
    primary: 'EXPLORE EQUIPMENT',
    secondary: 'REGISTER FREE',
  },

  company,
});
