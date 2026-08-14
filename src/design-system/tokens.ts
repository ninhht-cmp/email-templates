// Single source of truth for brand tokens. Injected into every template at build time.
// Change a value here → it updates everywhere on the next build. Validated against
// `tokensSchema` (build/schema.ts). Colours sampled from Figma (see docs/tokens.md).

export const tokens = {
  color: {
    // Brand
    orange: '#F37134', // decorative only (accent bar, section rules, chip) — fails text contrast
    orangeStrong: '#E5641F', // vibrant, AA-large 3.4:1 — text, links, buttons, badges
    orangeSoftBg: '#FEF1EB',
    orangeSoftBorder: '#F6C6A6',
    navy: '#143E69',
    navyDeep: '#001942', // high-emphasis CTA fill (darker than navy)
    heading: '#122941',
    heroTitle: '#003B79', // hero headline only

    // Text
    body: '#4A4A4A',
    muted: '#4E5A64',
    mutedLight: '#6B7280',
    footer: '#6B7280',

    // Lines / surfaces
    hairline: '#E6E8EB',
    divider: '#EDEFF2',
    canvas: '#F4F5F7',
    white: '#FFFFFF',
    skyBg: '#F1F8FF', // light-blue band behind a hero
    panelBg: '#EDF0FF', // inset panel (benefit strip)
    panelBorder: '#CBD7FF', // dividers inside an inset panel

    // Badges / accents
    badgeGrayBg: '#ECECEC',
    badgeGrayText: '#48505E',
    whatsapp: '#25D366',
  },

  font: {
    // Inter (loaded web font on supporting clients) with a premium native fallback per
    // platform: SF Pro on Apple, Segoe UI on Windows/Outlook, Roboto on Android, then Arial.
    stack:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    webFontUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  },

  layout: {
    width: '600px',
    padX: '32px',
  },
} as const;
