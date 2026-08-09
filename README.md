# COMACPRO — Email Templates

Data-driven **MJML** compiled to bulletproof inline HTML — table layout, inline CSS and VML
fallbacks for Outlook. You author clean source; the build produces the email HTML.

## Project structure

Stack: **MJML** (Outlook-safe rendering) + **Nunjucks** (templating) + **TypeScript** (build + typed
content) + **zod** (runtime data contracts). Three tiers of reuse (see `docs/architecture.md`):

```
src/
  design-system/                # TIER 1 — brand-wide, used by every email
    tokens.ts                   #   SINGLE source of colours/fonts/spacing (typed)
    head.njk                    #   meta + fonts + theme + responsive CSS
    components/                  #   one macro per file, generic + param-driven
      button.njk  badge.njk  section-title.njk
  blocks/                       # TIER 2 — opt-in shared blocks (include only if the email needs them)
    signature.njk  company-legal.njk  footer.njk
    shared-content.ts           #   data for the shared blocks (company legal name / UEN / offices)
  emails/                       # TIER 3 — one self-contained folder per email (colocation)
    supplier-onboarding/  buyer-invitation/
      index.mjml.njk            #   ENTRY — composes head + section includes
      sections/                 #   this email's body sections (hero, intro, why-partner, …)
      content.ts                #   content data (parsed by content.schema.ts)
      content.schema.ts         #   zod shape contract for the content
      meta.ts                   #   build/ops metadata: category, subject, requiredKeys
      assets/                   #   this email's images (+ icons/ masters)
build/                          # TypeScript pipeline (create-env, discover, build-email, render,
                                #   validate, write-gallery, schema, config, main)
test/                           # snapshot tests (build each email, diff against __snapshots__/)
dist/                           # generated HTML + preview gallery
docs/                           # architecture, tokens, list-unsubscribe
```

### Two template syntaxes — do not mix them up

| Syntax | When it runs | Use for |
|---|---|---|
| `{$ … $}` | build time (Nunjucks) | tokens, content, loops: `{$ tokens.color.orange $}`, `{% for f in content.features %}` |
| `{{ … }}` | send time (mail engine) | merge fields that pass through untouched: `{{company_name}}` |

Nunjucks' variable delimiter was remapped to `{$ $}` precisely so `{{ }}` merge tags survive the build.
Template context: **`tokens`** (design system) · **`content`** (this email) · **`meta`** (build/ops).

## Build & test

```bash
npm install          # once
npm run build        # discover + build every email -> dist/*.html + dist/index.html
npm run build:min    # minified output
npm run typecheck    # tsc --noEmit (types + zod contracts)
npm test             # snapshot tests (UPDATE_SNAPSHOTS=1 npm test to accept intended changes)
npm run validate     # typecheck + build + test (what CI runs)
```

Requires Node ≥ 20. The build is the quality gate — invalid `meta`, MJML errors, or undeclared
merge keys all fail it (and CI).

Each email produces **two files**:
- `dist/<name>.html` — **shippable**: raw `{{keys}}` intact, paste this into the sending system.
- `dist/<name>.preview.html` — **review only**: merge keys filled with sample values so it looks
  like a real sent email (this is what the gallery links to).
- `dist/KEYS.md` — auto-generated **merge-key reference** (key · description · sample, per email).

Sample values live in `build/preview-samples.ts` (shared defaults); an email can override any of
them via `meta.previewSamples` (e.g. a real avatar URL).

## Add a new email

1. `cp -r src/emails/supplier-onboarding src/emails/<name>` (or make a fresh folder).
2. Edit `content.ts` + `content.schema.ts` (content), `sections/` (layout — reuse `design-system/`
   components + `blocks/`), `meta.ts` (category, `requiredKeys`), and `assets/`.
3. `npm run build` → the folder is auto-discovered; `dist/<name>.html` + a gallery entry appear.

The build reconciles the `{{keys}}` you actually render against `meta.requiredKeys` — using an
undeclared key **fails the build**, so the key list stays honest without manual tracking.

### CTA links

The buyer-invitation ends on the two buttons from the design — **EXPLORE EQUIPMENT** and
**REGISTER FREE**. Each has its own merge key (`{{explore_equipment_url}}` / `{{register_url}}`),
so which one is treated as *the* tracked CTA is decided in the sending/admin system, not here.
Labels are content (`content.ctas`); only the links are merge keys.

There is deliberately **no closing "BECOME AN OFFICIAL SUPPLIER" section** and no equipment grid in
this campaign — it ends on the button pair.

### Shared blocks

`src/blocks/` holds only what more than one email genuinely renders: `signature` · `company-legal` ·
`footer`, with their data in `src/blocks/shared-content.ts`. Change an office address there and
**both emails** pick it up on the next build. Blocks are **opt-in** — an email includes just what it
needs, and nothing is promoted to `blocks/` on speculation. A section used by one email stays in
that email's `sections/` folder.

## Edit content

- **Copy, images, feature/equipment lists** → `src/emails/<name>/content.ts`. **Company
  legal name / UEN / offices** → `src/blocks/shared-content.ts` (shared by every email). Add an
  equipment item = add one array entry; the loop renders it. No markup to touch.
- **Colours / fonts** → `src/design-system/tokens.ts`. Change once, applies everywhere on rebuild.
- **Layout / structure** → `sections/*.njk` and the `design-system/components/` macros.

## Dynamic (send-time) merge fields

The `{{keys}}` each email needs — with descriptions and sample values — are **auto-generated** into
`dist/KEYS.md` on every build (from `meta.requiredKeys`, so it never drifts). Open that file for the
per-email list to map into the sending system.

Different tag syntax (`[VAR]`, `%VAR%`, `*|VAR|*`)? Change them in the templates and rebuild.

## Swapping placeholder images

**Every image is a URL in one place: `content.ts`.** For local preview they are repo-relative (logo,
hero, icons) or the `{{sender_avatar}}` merge tag. **Before sending, host each on a CDN and
paste the absolute HTTPS URL into `content.ts`** — email clients can't load repo-relative paths. The
build lists every still-temporary URL after each run so you know exactly what to swap. Recommended
sizes (retina):

| Field | Asset | Size |
|---|---|---|
| `assets.logo` | Logo (hero, top-left) — transparent PNG | ≥ 260×42 |
| `assets.whatsappIcon` · `assets.emailIcon` | Signature contact icons | 30×30 |
| `assets.avatar` (or {{sender_avatar}}) | Sender avatar — any ratio; `object-fit:cover` crops it to a circle (Apple Mail/iOS/webmail). Outlook ignores object-fit, so a non-square source distorts there only. | ≥160×160 |
| **supplier-onboarding** | | |
| `assets.hero` | Raw machinery photo (2:1). The white left gradient is a **CSS layer** in the entry head. | 2:1, ≥ 1200×600 |
| `features[].icon` (×4) | Feature icons — plain transparent PNG (the pastel chip is a CSS container) | 52×52 |
| `reassurance.icon` | Callout shield | 76×76 |
| `equipment[].img` (×6) | Square equipment photos | 240×240 |
| **buyer-invitation** | | |
| `assets.heroBrowser` | Hero product shot — browser mock **with the "Comacpro.net" pill already composited in** (see below) | 660×443 |
| `markets[].flag` (×5) | **Already hosted — nothing to do.** Served from `flagcdn.com/h40/<iso2>.png` (60×40 = 2× the 20×20 badge); the circle is CSS. The 6th chip uses the local globe icon. | — |
| `stats[].icon` (×2) | White line icons (the orange disc behind them is a CSS container) | 56×56 |
| `benefits[].icon` (×3) | Orange line icons for the inset strip | 60×60 |

> **Icons are hosted images**, not inline SVG, so they render in **every client** (Gmail, Outlook,
> Apple Mail). The repo keeps the source SVGs under `assets/icons/` as design masters — export each
> to PNG, host it, and put the URL in `content.ts`. The pastel chip behind feature icons is a CSS
> table cell (in `sections/why-partner.njk`), so its colour stays in the design system, not baked
> into the image.

> **Flag badges are circles made in CSS, not baked images**, so they come straight from flagcdn
> with nothing to host. Two rules keep that working:
>
> 1. **Size them with an INLINE style, never the `width`/`height` attributes.** MJML's boilerplate
>    CSS carries `img { height: auto }`, which outranks HTML attributes — rely on the attributes and
>    each image's height falls back to its own aspect ratio, so the square globe icon renders taller
>    than the 3:2 flags and visibly inflates its chip. Inline styles outrank embedded CSS, so
>    `style="height:20px"` is what actually pins every badge to the same box. Keep the attributes
>    too: blocked-image clients read them before any CSS applies.
> 2. `object-fit: cover` crops to the square without distortion, and `object-position` — set per
>    market via the optional `focus` field in `content.ts` — shifts that crop when a flag's emblem
>    is off-centre (China's large star sits in the left quarter and a centred crop halves it).
>
> **Outlook desktop ignores `border-radius` and `object-fit`**, so there the flags are squares,
> slightly squashed, inside square chips — legible, just not round. If Outlook fidelity matters more
> than asset count, bake round 40×40 PNGs instead (`magick … -compose DstIn` with a circle mask) and
> host them; a round source is round in every client.

> **The buyer-invitation hero is a composite.** The design overlaps the "Comacpro.net" pill onto the
> browser mock, and email clients cannot overlap two elements (no absolute positioning). So the two
> masters — `whole-browser.png` + `search-comacpro.png` — are pre-composited into
> `hero-browser.png`. If either master changes, regenerate it:
>
> ```bash
> cd src/emails/buyer-invitation/assets
> magick -size 660x443 xc:none \
>   \( whole-browser.png   -filter Lanczos -resize 574x396! \) -geometry +87+0   -composite \
>   \( search-comacpro.png -filter Lanczos -resize 377x105! \) -geometry +0+338 -composite \
>   -strip PNG32:hero-browser.png
> ```

Every image has `alt` + explicit `width`/`height` so blocked-image inboxes stay readable.

## Client compatibility

- 600px table layout, all CSS inlined — Gmail, Outlook (2007–365 via VML), Apple Mail, mobile.
- **buyer-invitation hero** = flat `background-color` band + two columns (text | composited product
  shot). No background image and no gradient, so it renders identically everywhere, Outlook included.
- **Market chips** are centered inline-block `<span>`s in a single `mj-text`, so the row reflows on
  its own (6 chips do not fit one 536px line — they wrap 4 + 2, and to fewer per line on mobile)
  with no width maths. Outlook's Word engine ignores inline-block padding and `border-radius`:
  there the chips degrade to bordered, square text runs — legible, just less rounded.
- **Proof panel** (the WHY BUYERS CHOOSE section) = one container answering the section question
  once: numbers on top, hairline, benefits below. MJML has no multi-row panel primitive — an
  `mj-section` IS a row and `mj-wrapper` cannot nest — so it is **three sibling sections sharing one
  background**, with the `border-radius` split across the first (`12px 12px 0 0`) and last
  (`0 0 12px 12px`) so the seams are invisible. The wrapper supplies the white side-gutter.
  Outlook squares off the corners; the panel itself is unaffected.
  Each stat is a column (number above its label) and the pair stays **one row at every width** —
  `.stat-col` re-asserts `width:50%` below 480px, since MJML only applies its 50% above that and
  otherwise falls back to the inline `width:100%` that stacks columns. Half a phone screen is only
  ~120px of usable column, so mobile also shrinks the number/label and pins the number to one line:
  MJML puts `word-break: break-word` on the cell, which otherwise breaks a run of digits mid-number
  ("200,00 / 0+" at 320px). A second breakpoint under 360px takes both one step smaller so the
  longer label does not wrap alone and leave the pair lopsided.
  > `mj-table` and `mj-button` default to `padding: 10px 25px`. Inside a narrow column that silently
  > eats 50px and breaks labels mid-word — both are explicitly set to `padding="0"` here.
- supplier-onboarding hero = raw 2:1 machinery image (`mj-section background-url`, VML for Outlook) + a white
  left→right gradient **CSS layer** over it, with the logo + text on the light left. The gradient
  override targets `.hero-bg table[background]` — the background-painting table — since MJML nests
  an extra wrapper div that breaks `>` child selectors. Apple Mail / iOS / Gmail / Yahoo render the
  gradient; **Outlook ignores CSS gradients and shows the bare photo** (text over image) — the
  trade-off of keeping the gradient as a layer instead of baking it into the asset.
  > On mobile the columns stack and the gradient switches to a top-down scrim. Tighten that scrim
  > if narrow-screen readability needs more.
- Buttons are MJML bulletproof buttons (VML-backed).
- Equipment grid: 6-across desktop → 2-across mobile via the `.eq-col` media query. Clients that
  strip `<style>` fall back to a single stacked column — still readable.
- **Light only:** `color-scheme` / `supported-color-schemes` are pinned to `light` so dark-mode
  clients render the design as-is instead of auto-inverting the brand.
- Output: supplier-onboarding ~78KB, buyer-invitation ~72KB — both under Gmail's 102KB clipping
  limit. `npm run build:min` buys back roughly a third if a future section gets close.

## CI

`.github/workflows/build.yml` runs `npm ci && npm run build` on every push/PR — the build fails if
any template has an MJML error, so broken templates can't merge.
