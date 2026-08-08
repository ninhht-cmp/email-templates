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
  emails/                       # TIER 3 — one self-contained folder per email (colocation)
    supplier-onboarding/
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

## Edit content

- **Copy, images, feature/equipment lists** → `src/emails/supplier-onboarding/content.ts`. Add an
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
| `assets.hero` | Raw machinery photo (2:1). The white left gradient is a **CSS layer** in the entry head. | 2:1, ≥ 1200×600 |
| `features[].icon` (×4) | Feature icons — plain transparent PNG (the pastel chip is a CSS container) | 52×52 |
| `reassurance.icon` | Callout shield | 76×76 |
| `assets.whatsappIcon` · `assets.emailIcon` | Signature contact icons | 30×30 |
| `equipment[].img` (×6) | Square equipment photos | 240×240 |
| `assets.avatar` (or {{sender_avatar}}) | Sender avatar — any ratio; `object-fit:cover` crops it to a circle (Apple Mail/iOS/webmail). Outlook ignores object-fit, so a non-square source distorts there only. | ≥160×160 |

> **Icons are hosted images**, not inline SVG, so they render in **every client** (Gmail, Outlook,
> Apple Mail). The repo keeps the source SVGs under `assets/icons/` as design masters — export each
> to PNG, host it, and put the URL in `content.ts`. The pastel chip behind feature icons is a CSS
> table cell (in `sections/why-partner.njk`), so its colour stays in the design system, not baked
> into the image.

Every image has `alt` + explicit `width`/`height` so blocked-image inboxes stay readable.

## Client compatibility

- 600px table layout, all CSS inlined — Gmail, Outlook (2007–365 via VML), Apple Mail, mobile.
- Hero = raw 2:1 machinery image (`mj-section background-url`, VML for Outlook) + a white
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
- Output ~71KB, under Gmail's 102KB clipping limit.

## CI

`.github/workflows/build.yml` runs `npm ci && npm run build` on every push/PR — the build fails if
any template has an MJML error, so broken templates can't merge.
