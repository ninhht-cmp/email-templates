# Brand tokens — provenance

The **runtime source of truth is `src/design-system/tokens.ts`** — the build injects those values into every
template, so changing a color there updates everywhere on rebuild. This document records what the
tokens are and where they came from (sampled directly from the approved Figma design). Keep the two
in sync: if you change `tokens.ts`, reflect it here.

## Colors

**Two-tier orange:** `#F37134` is the most vibrant but fails contrast as text/on-buttons (2.91:1).
It is used **decoratively only**; anything carrying meaning (links, text, buttons, badge labels)
uses **`orangeStrong` `#E5641F`** (3.4:1 — clears WCAG AA-large, used on bold CTA/callout text).
Chosen for brand vibrancy over strict AA-normal on small links (a common, accepted trade-off).

| Token | Hex | Where used |
|---|---|---|
| Orange (decorative) | `#F37134` | Accent bar, section-title rules — never text/buttons |
| Orange strong (text) | `#E5641F` | CTA button, links, callout text, `.brand` emphasis, solid badge |
| Orange soft (bg) | `#FEF1EB` | Feature icon chip, soft badge background |
| Orange soft (border) | `#F6C6A6` | Callout border |
| Navy (secondary) | `#143E69` | "Become a supplier" button, logo mark |
| Heading / dark text | `#122941` | Headings, greeting, overlines, card labels, company name |
| Body text | `#4A4A4A` | Paragraph copy, addresses |
| Muted text | `#4E5A64` | Feature descriptions |
| Muted text (light) | `#6B7280` | Sender title, microcopy, UEN label |
| Footer text | `#6B7280` | Unsubscribe line |
| Hairline / border | `#E6E8EB` | Equipment card border |
| Divider | `#EDEFF2` | Section dividers |
| Badge gray (bg) | `#ECECEC` | Vietnam Office badge |
| Badge gray (text) | `#48505E` | Vietnam Office badge text |
| WhatsApp green | `#25D366` | Phone icon |
| Hero fallback (Outlook) | `#10233F` | Behind hero image when blocked |
| Canvas | `#F4F5F7` | Email background outside the 600px card |

## Typography

| Token | Value |
|---|---|
| Font stack | `Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif` (Outlook falls back to Arial) |
| Body | 15px / 1.6 |
| Greeting | 17px / 700 |
| Hero headline | 32px / 800 (26px on mobile) |
| Section overline | 14px / 800, letter-spacing 0.6px |
| Feature title | 15px / 700 |
| Small / caption | 12–13px |

## Layout

| Token | Value |
|---|---|
| Email width | 600px |
| Section horizontal padding | 32px (24–26px on grid rows) |
| Button radius | 6px |
| Card / callout radius | 8px / 12px |
| Mobile breakpoint | ≤ 600px (columns stack) |

> Sampled from the design PNG (coordinate-free color extraction). If the Figma file is later shared
> with edit access, pull exact `get_variable_defs` tokens and reconcile any drift here.
