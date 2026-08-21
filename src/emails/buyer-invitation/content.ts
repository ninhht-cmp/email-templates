// Content for the buyer-invitation email. Parsed through contentSchema at import, so a wrong
// shape (missing field, wrong type) fails the build with a clear message.
//
// EVERY image is a URL in one place (here). For local preview they are repo-relative; before
// sending, host them and replace with absolute HTTPS URLs (the build lists any still-temporary
// URL after each run). Send-time {{merge_tags}} stay inline.

// Content for the shared legal footer block — same in every campaign.
import { company, compliance, sharedAssets } from '../../blocks/shared-content.ts';
import { type BuyerInvitationContent, contentSchema } from './content.schema.ts';

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
    ...sharedAssets, // logo + signature contact icons (shared, not per-campaign)
    heroBrowser: '../src/emails/buyer-invitation/assets/hero-browser.png',
    avatar: '{{sender_avatar}}', // per-sender, filled at send time
  },

  hero: {
    // No forced <br>: on desktop it made "Construction Equipment" one line wider than the 42%
    // column, and Outlook's Word engine expanded the cell past 600px, dropping the image column
    // below. Let it wrap naturally to fit the column instead.
    heading: 'Find Reliable Used Construction Equipment',
    subline: 'For your upcoming projects',
  },

  markets: [
    { flag: `${FLAG}/jp.png`, label: 'Japan' },
    { flag: `${FLAG}/cn.png`, label: 'China', focus: 'left' },
    { flag: `${FLAG}/kr.png`, label: 'South Korea' },
    { flag: `${FLAG}/eu.png`, label: 'European Union' },
    { flag: `${FLAG}/vn.png`, label: 'Vietnam' },
    {
      flag: `../src/emails/buyer-invitation/assets/icons/global.svg`,
      label: 'Global market',
    },
  ],

  // Thousands separator is a COMMA: the copy is English, where "10.000+" reads as ten-point-zero.
  // No `icon`: the proof panel renders numbers + labels only (the orange discs were dropped).
  stats: [
    {
      value: '200,000+',
      label: 'EQUIPMENT LISTINGS',
    },
    {
      value: '10,000+',
      label: 'VERIFIED SUPPLIERS',
    },
  ],

  benefits: [
    {
      icon: `../src/emails/buyer-invitation/assets/icons/find.svg`,
      title: 'FIND THE RIGHT MACHINE FAST',
    },
    {
      icon: `../src/emails/buyer-invitation/assets/icons/shipping.svg`,
      title: 'GLOBAL SHIPPING SUPPORT',
    },
    {
      icon: `../src/emails/buyer-invitation/assets/icons/assistance.svg`,
      title: 'DEDICATED BUYER ASSISTANCE',
    },
  ],

  // Labels are content; each button's link is its own merge key (see meta.requiredKeys), so
  // tracking / which one counts as THE CTA is configured in the sending system.
  ctas: {
    primary: 'EXPLORE EQUIPMENT',
    secondary: 'REGISTER FREE',
  },

  company,
  compliance,
});
