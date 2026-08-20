# COMACPRO — Email Templates

Data-driven **MJML** compiled to bulletproof inline HTML — table layout, inline CSS, and VML
fallbacks for Outlook. You author clean source; the build produces shippable email HTML plus a
preview gallery you copy from.

## Stack

**MJML** (Outlook-safe rendering) · **Nunjucks** (templating) · **TypeScript** (build + typed
content) · **zod** (runtime data contracts) · **Biome** (format + lint) · **Playwright** (only for
ad-hoc screenshots; not required to build). Three tiers of reuse — see `docs/architecture.md`.

```
src/
  design-system/                # TIER 1 — brand-wide, used by every email
    tokens.ts                   #   SINGLE source of colours / fonts / radius (typed)
    head.njk                    #   meta + fonts + colour-scheme + responsive CSS
    components/                 #   one macro per file (button · badge · section-title)
  blocks/                       # TIER 2 — opt-in shared blocks (include only if the email needs them)
    signature.njk  company-legal.njk  footer.njk
    shared-content.ts           #   data for the shared blocks (legal name / UEN / offices / compliance)
    shared-content.schema.ts    #   zod shape for that shared data (spread into each email's schema)
  emails/                       # TIER 3 — one self-contained folder per email (colocation)
    supplier-onboarding/  buyer-invitation/
      index.mjml.njk            #   ENTRY — composes head + a declared section registry
      sections/                 #   this email's body sections (hero, intro, …)
      content.ts                #   content data (parsed by content.schema.ts)
      content.schema.ts         #   zod shape contract for the content
      meta.ts                   #   build/ops metadata: category, subject, adLabel?, colorScheme?, requiredKeys
      assets/                   #   this email's images (+ icons/)
build/                          # TypeScript pipeline — one concern per file:
                                #   render-email · html-transforms · analyze · build-email · validate-email
                                #   schema · config · create-env · discover-emails · preview-samples
                                #   main · lint-compat · simulate-clients · write-{gallery,simulator,keys-doc,tokens-page}
test/                           # unit tests (build/*.test.ts) + snapshot tests (snapshot.test.ts)
dist/                           # generated — NOT committed (CI builds + deploys to GitHub Pages)
docs/                           # architecture · tokens · email-testing · list-unsubscribe · advertising-labels
```

### Two template syntaxes — do not mix them up

| Syntax | When it runs | Use for |
|---|---|---|
| `{$ … $}` | build time (Nunjucks) | tokens, content, loops: `{$ tokens.color.orange $}`, `{% for f in content.features %}` |
| `{{ … }}` | send time (mail engine) | merge fields that pass through untouched: `{{company_name}}` |

Nunjucks' variable delimiter was remapped to `{$ $}` precisely so `{{ }}` merge tags survive the
build. Template context: **`tokens`** (design system) · **`content`** (this email) · **`meta`** (build/ops).

## Build & test

```bash
npm install          # once
npm run build        # discover + build every email → dist/ (html, min.html, preview.html, gallery…)
npm run build:min    # same, minified console output path
npm run lint         # Biome (format check + lint) on build/ + tests
npm run format       # Biome auto-format
npm run typecheck    # tsc --noEmit (types + zod contracts)
npm run lint:email   # email-client compatibility lint of the built email HTML (build first)
npm run simulate     # write dist/sim/*.{newoutlook,ganga}.html to reproduce CSS-stripping clients
npm test             # unit + snapshot tests (UPDATE_SNAPSHOTS=1 npm test to accept intended changes)
npm run validate     # biome + typecheck + build + lint:email + tests (what CI runs)
```

Requires Node ≥ 20. **The build is the quality gate** — invalid `meta`, MJML errors, or undeclared
merge keys fail it (and CI). It also *warns* (non-fatal) about assets that still need hosting and
marketing emails with no advertising label.

### Output artifacts (per email, in `dist/`)

- `<name>.html` — shippable, beautified, raw `{{keys}}` intact.
- `<name>.min.html` — shippable, minified (~30% smaller) — **what the gallery copies**.
- `<name>.preview.html` — merge keys filled with sample values, for review only.
- Shared: `index.html` (gallery), `simulator.html` (viewport simulator), `tokens.html`
  (design-token reference), `KEYS.md` (merge-key reference), `sim/` (client-family sims).

`dist/` is git-ignored; CI (`.github/workflows/pages.yml`) rebuilds and deploys it to GitHub Pages.

## The gallery — how to ship a template

Open `dist/index.html` (locally or on Pages). Pick a template from the sidebar; preview it at
desktop/mobile width; light/dark theme toggle (top-right).

1. **Copy HTML** → opens **Customize assets**: paste your hosted URL for each asset that still points
   at a local repo path (they start empty, flagged amber). Copy is blocked until every local asset
   has a valid `http(s)://` URL, so you can never ship a repo-relative path. Then it copies the
   minified HTML with your URLs baked in.
2. **Merge keys** → the `{{keys}}` this template needs, each with a description and a per-key copy
   button. Add them to your sending system. (`{{unsubscribe}}` is your ESP's built-in toggle, not a
   custom variable — see the modal note.)
3. **Raw ↗** → the shippable HTML with raw `{{keys}}`, to see where each key sits.

Sample preview values live in `build/preview-samples.ts`; an email overrides any via
`meta.previewSamples`.

## Add a new email

1. `cp -r src/emails/supplier-onboarding src/emails/<name>` (or a fresh folder).
2. Edit `content.ts` + `content.schema.ts`, `sections/`, and the section registry + styles in
   `index.mjml.njk`; set `meta.ts` (`category`, `requiredKeys`, optional `adLabel` / `colorScheme`);
   add `assets/`.
3. `npm run build` → the folder is auto-discovered; its files + a gallery entry appear.

The build reconciles the `{{keys}}` you actually render against `meta.requiredKeys` — an undeclared
key **fails the build**, so the key list stays honest without manual tracking.

### Section registry

Each entry declares its body as ordered lists, not a run of includes:

```njk
{% set sections = ["hero", "intro", "markets", "proof", "cta-pair"] %}
{% set blocks = ["signature", "company-legal", "footer"] %}
```

Reordering or adding a section is a one-line edit. `blocks/` holds only what more than one email
genuinely renders (`signature` · `company-legal` · `footer`); nothing is promoted there on
speculation — a section used by one email stays in that email's `sections/`.

## Edit content

- **Copy, images, feature/equipment lists** → `src/emails/<name>/content.ts`. **Legal name / UEN /
  offices / compliance disclosure** → `src/blocks/shared-content.ts` (shared by every email).
- **Colours / fonts / radius** → `src/design-system/tokens.ts`. Change once, applies on rebuild.
  Spacing (4px rhythm) and type sizes are documented conventions, not tokens yet — see
  `docs/tokens.md`.
- **Layout / structure** → `sections/*.njk` + the `design-system/components/` macros.
- **Subject / advertising label** → `meta.ts`. Set `adLabel: '[QC]' | '[AD]'` for a campaign that
  must carry a VN NĐ91 advertising label (enforced at subject position 0); omit for a global
  audience (a build warning keeps the omission conscious). See `docs/advertising-labels.md`.
- **Dark mode** → `meta.colorScheme`: `'light'` (default, pins light so clients don't auto-invert
  the brand) or `'auto'` (advertise `light dark`; needs a dark-safe logo before it's worth it).

## Merge fields

The `{{keys}}` each email needs — with descriptions and samples — are auto-generated into
`dist/KEYS.md` on every build (from `meta.requiredKeys`, so it never drifts) and shown in the
gallery's **Merge keys** modal. Different tag syntax in your ESP (`[VAR]`, `%VAR%`, `*|VAR|*`)?
Remap the delimiter in `build/config.ts` and rebuild.

## Assets

**Every image is a URL in one place: `content.ts`.** By default they point at the **local repo
files** (logo/hero → png, icons → svg, machinery → the scrim-baked png) so the preview always
renders offline. **Local paths won't load in an inbox** — before sending, give each a hosted URL,
either:
- per-send in the gallery's **Customize assets** modal (no code change), or
- durably by pasting hosted URLs into `content.ts` and committing.

The build lists every not-yet-hosted asset after each run. Equipment photos
(`storage.comacpro.net`) and market flags (`flagcdn.com`) are already real CDN URLs.

Recommended retina sizes: logo ≥260×42 · signature icons 30×30 · avatar ≥160×160 (any ratio,
`object-fit:cover` crops to a circle) · supplier hero 2:1 ≥1200×600 · feature icons 52×52 ·
reassurance shield 76×76 · equipment 240×240 · buyer hero-browser 660×443 · benefit icons 60×60.

> **Icons render as images, not inline SVG** — Gmail/Outlook don't reliably render SVG in `<img>`.
> The repo keeps SVGs under `assets/icons/` as design masters and previews with them; export to PNG
> and host before sending (the Customize-assets flow expects a hosted URL). The pastel chip behind
> feature icons is a CSS table cell (`sections/why-partner.njk`), so its colour stays in the design
> system, not baked into the image.

> **Two heroes are pre-composited** because email clients can't overlap elements or honour CSS
> gradients across Gmail/Outlook:
> - **buyer** `hero-browser.png` = the browser mock with the "Comacpro.net" pill already composited in.
> - **supplier** `comacpro-machinery.png` = the machinery photo with the white left→right legibility
>   **scrim baked into the pixels** (a CSS gradient did not survive Gmail/Outlook).
>
> The intermediate source layers are not kept in the repo — regenerate these from the design file if
> the art changes.

Every image has `alt` + explicit `width`/`height` so blocked-image inboxes stay readable.

## Responsive columns (fluid-hybrid)

Multi-column sections must sit side-by-side on desktop and stack on mobile across clients that treat
CSS very differently. MJML is mobile-first (columns inline `width:100%`, widened by a
`@media(min-width:480)` rule), which **collapses to one stacked column even on desktop** in clients
that drop `<style>`/media queries — **New Outlook / Outlook webview** and **Gmail on non-Google
accounts (GANGA)**. Two patterns handle it (`docs/architecture.md` §9):

- **Fluid-hybrid `mw()`** — the default. A column keeps inline `width:100%` and gets an inline
  `max-width` injected at build time (`applyFluidMaxWidth`), driven by the `mw(pct, contentWidth)`
  Nunjucks global (px derived from the column width% × section content width). No media query, so a
  wide viewport is side-by-side and a narrow one reflows — correct in New Outlook *and* GANGA.
- **`mj-group`** — only where columns must stay side-by-side at *every* width (the proof stats).

Verify both families with `npm run simulate` whenever you touch a column's width, padding, or `mw()`
call. Details + the real-send matrix are in `docs/email-testing.md`.

## Client compatibility

- 600px table layout, all CSS inlined — Gmail, Outlook (2007–365 via VML), Apple Mail, mobile.
- **Section titles** = centered text + a short rule below (no `width:1%`+nowrap trick, which made
  Outlook's Word engine wrap titles one character per line).
- **Buyer hero** = flat `background-color` band + two fluid-hybrid columns (text | composited shot).
- **Supplier hero** = machinery image (`mj-section background-url` + VML for Outlook) with the white
  fade **baked into the asset**, so it renders in every client (a `<style>` gradient did not survive
  Gmail/Outlook). Section `background-color` is white so an image-blocked inbox still reads dark-on-light.
- **Proof panel** = three sibling `mj-section`s sharing one background (MJML has no multi-row panel
  primitive), radius split across first/last so seams are invisible; stats stay 2-across via
  `mj-group`, shrinking on mobile so digits don't break mid-number.
- **Market chips** = inline-block `<span>`s that reflow on their own; Outlook squares the corners.
- Buttons are MJML bulletproof buttons (VML-backed). Equipment/feature grids reflow via the
  fluid-hybrid `mw()` widths + `.eq-col`/`.feat-col` mobile rules.
- **Colour scheme:** default pins `light` so dark-mode clients don't auto-invert the brand;
  `meta.colorScheme:'auto'` opts into `light dark` per email.
- Output stays under Gmail's 102 KB clip limit; `build:min` / the gallery's minified copy buy back
  ~30%.

## CI

- `build.yml` — on feature branches / PRs: `npm run lint && typecheck && build && test`.
- `pages.yml` — on `main`: `npm run validate`, then build + deploy `dist/` to GitHub Pages.
