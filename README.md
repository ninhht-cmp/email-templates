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
    head.njk                    #   THE breakpoint (mj-breakpoint) + meta + fonts + colour-scheme + mobile CSS
    preheader.njk               #   <mj-preview> + the padding that stops body copy leaking into it
    components/                 #   one macro per file (button · badge · section-title)
    assets/                     #   brand art rendered by every email (the logo)
  blocks/                       # TIER 2 — opt-in shared blocks (include only if the email needs them)
    signature.njk  company-legal.njk  footer.njk
    shared-content.ts           #   data for the shared blocks (legal name / UEN / offices / compliance / shared assets)
    shared-content.schema.ts    #   zod shape for that shared data (spread into each email's schema)
    assets/                     #   art these blocks render (signature contact icons, preview avatar)
  emails/                       # TIER 3 — one self-contained folder per email (colocation)
    supplier-onboarding/  buyer-invitation/  order-confirmation/
      index.mjml.njk            #   ENTRY — composes head + a declared section registry
      sections/                 #   this email's body sections (hero, intro, …)
      content.ts                #   content data (parsed by content.schema.ts)
      content.schema.ts         #   zod shape contract for the content
      meta.ts                   #   build/ops metadata: category, subject, adLabel?, requiredKeys
      assets/                   #   art only THIS email uses (+ icons/)
build/                          # TypeScript pipeline — one concern per file:
                                #   render-email · html-transforms · analyze · build-email · validate-email
                                #   check-assets · image-meta · schema · config · create-env · discover-emails
                                #   preview-samples · main · lint-compat · optimize-assets
                                #   write-{gallery,keys-doc,tokens-page,text,sims}
test/                           # unit tests (build.test.ts) + snapshot tests (snapshot.test.ts)
dist/                           # generated — NOT committed (CI builds + deploys to GitHub Pages)
docs/                           # architecture · tokens · email-testing · list-unsubscribe · advertising-labels
```

**`order-confirmation` is the responsive reference template.** It carries no art of its own, so it
renders fully offline, and each of its sections demonstrates one layout pattern (two stacking
columns · a table that must not stack · a 4-across grid that goes 2-across). Open it at Desktop vs
Mobile in the gallery before copying a pattern into a new email.

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
npm run assets:optimize          # report soft/heavy assets + SVG icons needing PNG export
npm run assets:optimize -- --write   # …and produce them into dist/assets/ (needs ImageMagick)
npm test             # unit + snapshot tests (UPDATE_SNAPSHOTS=1 npm test to accept intended changes)
npm run validate     # biome + typecheck + build + lint:email + tests (what CI runs, on PRs and main)
```

Requires Node ≥ 20. **The build is the quality gate.** It **fails** on:

| Gate | Why it's fatal |
|---|---|
| invalid `meta.ts` / MJML errors | broken output |
| a `{{key}}` not declared in `meta.requiredKeys` | the key list would silently lie |
| a **second breakpoint** in the output | email has two states; a third is web-CSS thinking (see below) |
| a `fluid` column with no inline `max-width` | columns would stack on desktop in New Outlook / Gmail-GANGA — invisible in any browser preview |
| a **marketing** email with no `{{unsubscribe}}` | CAN-SPAM / GDPR / NĐ91 |

and *warns* (non-fatal) about assets that still need hosting, images that are not retina or over the
per-image weight budget, local SVG icons not yet rasterized, and marketing emails with no
advertising label.

### Output artifacts (per email, in `dist/`)

- `<name>.html` — shippable, beautified, raw `{{keys}}` intact.
- `<name>.min.html` — shippable, minified (~30% smaller) — **what the gallery copies**.
- `<name>.txt` — **the text/plain alternative part.** Send it alongside the HTML: an HTML-only
  message is a cheap spam signal, and these lists are cold-sourced. Generated from the HTML, so it
  can't drift; merge keys stay raw and every link keeps its URL inline.
- `<name>.preview.html` — merge keys filled with sample values, for review only.
- Shared: `index.html` (gallery — preview + copy), `tokens.html` (design-token reference),
  `KEYS.md` (merge-key reference), `sim/` (client-family sims, written on every build),
  `assets/` (only after `npm run assets:optimize -- --write` — the CDN upload staging folder).

Sizes are reported twice: **raw** (the file) and **sent** (quoted-printable-encoded, ×1.04) —
Gmail's 102 KB clip limit measures the encoded body, so "sent" is the number that matters.

`dist/` is git-ignored; CI (`.github/workflows/pages.yml`) rebuilds and deploys it to GitHub Pages.

## The gallery — how to ship a template

Open `dist/index.html` (locally or on Pages). Pick a template from the sidebar; preview it at
desktop/mobile width; light/dark theme toggle (top-right).

0. **The inbox row** above the frame shows the **subject** and **preheader** as the recipient first
   sees them, with a copy button — those are the two strings you must paste into the ESP next to the
   HTML, and they used to live only in `KEYS.md`. The greyed tail marks where the client stops
   reading the preheader.
1. **Copy HTML** → opens **Customize assets**: paste your hosted URL for each asset that still points
   at a local repo path (they start empty, flagged amber). Copy is blocked until every local asset
   has a valid `http(s)://` URL, so you can never ship a repo-relative path. Then it copies the
   minified HTML with your URLs baked in.
2. **Merge keys** → the `{{keys}}` this template needs, each with a description and a per-key copy
   button. Add them to your sending system. (`{{unsubscribe}}` is your ESP's built-in toggle, not a
   custom variable — see the modal note.)
3. **Raw ↗** → the shippable HTML with raw `{{keys}}`, to see where each key sits.
4. **Text part ↗ · New Outlook sim ↗ · Gmail GANGA sim ↗** → the `.txt` alternative part and the two
   CSS-stripped renderings (layer 3 of `docs/email-testing.md`), which is where a broken column
   shows up and a browser preview does not.

> If a copy button says it **could not** copy, it means the browser refused the clipboard (a
> `file://` page is not a secure context). Open the `.min.html` and copy from there — the button no
> longer claims success when the clipboard is empty.

Sample preview values live in `build/preview-samples.ts`; an email overrides any via
`meta.previewSamples`.

## Add a new email

1. `cp -r src/emails/order-confirmation src/emails/<name>` — the reference template: it has one of
   each responsive pattern and no art to re-host. (Copy `supplier-onboarding` instead if you want the
   full marketing shape: hero image, signature, opt-out footer.)
2. Edit `content.ts` + `content.schema.ts`, `sections/`, and the section registry + styles in
   `index.mjml.njk`; set `meta.ts` (`category`, `requiredKeys`, optional `adLabel`);
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
- **Category** → `meta.ts`. `marketing` requires an opt-out (build-enforced) and warns about a
  missing advertising label; `transactional` renders no unsubscribe clause at all. It is not a label —
  it changes what gets rendered and what gets checked.
- **Subject / advertising label** → `meta.ts`. Set `adLabel: '[QC]' | '[AD]'` for a campaign that
  must carry a VN NĐ91 advertising label (enforced at subject position 0); omit for a global
  audience (a build warning keeps the omission conscious). See `docs/advertising-labels.md`.
- **Dark mode** → nothing to set. The emails are **light-only** by decision: `design-system/head.njk`
  pins `color-scheme: light` for every one of them, so dark-mode clients render the brand as designed
  instead of auto-inverting it. There is no per-email flag. (The *gallery* has a light/dark toggle —
  that's the tooling UI, a real web page, unrelated to the emails.)

## Merge fields

The `{{keys}}` each email needs — with descriptions and samples — are auto-generated into
`dist/KEYS.md` on every build (from `meta.requiredKeys`, so it never drifts) and shown in the
gallery's **Merge keys** modal. Different tag syntax in your ESP (`[VAR]`, `%VAR%`, `*|VAR|*`)?
Remap the delimiter in `build/config.ts` and rebuild.

## Assets

**Every image is a URL in one place** — `content.ts` for art only that email uses, or
`blocks/shared-content.ts` (`sharedAssets`) for the logo and the signature contact icons, which are
brand/block-level and used to be byte-identical copies in each email folder. By default they point at
the **local repo files** so the preview always renders offline. **Local paths won't load in an
inbox** — before sending, give each a hosted URL, either:
- per-send in the gallery's **Customize assets** modal (no code change), or
- durably by pasting hosted URLs into `content.ts` / `shared-content.ts` and committing.

The build lists every not-yet-hosted asset after each run, plus any image that is **not retina** for
the size it renders at or over the **200 KB** per-image budget. Equipment photos
(`storage.comacpro.net`) and market flags (`flagcdn.com`) are already real CDN URLs.

```bash
npm run build && npm run assets:optimize -- --write
```

produces `dist/assets/` ready to upload: every SVG icon rasterized to PNG **at 2× the width the
built HTML actually renders it at** (derived, not guessed), and every oversized photographic PNG
re-encoded to JPEG q85. It does **not** rewrite `content.ts` — swapping a brand asset is a visual
change, so it prints the edit and leaves the call to you.

Retina sizes are **checked, not just recommended**: the build compares every local image against
2× the width the built HTML renders it at and names the ones that fall short (today: the logo, a
176×28 file rendered at 180px — it needs re-exporting from the design source, which no script can
do). `npm run assets:optimize` derives the right export size for each SVG icon the same way.

> **Icons render as images, not inline SVG** — Gmail (web + app) and Outlook render **nothing at all**
> for an SVG in `<img>`. The repo keeps SVGs under `assets/icons/` as design masters and previews
> with them; `npm run assets:optimize -- --write` exports the PNGs. `lint:email` **warns** while an
> SVG is still a local master and **fails** the moment one is *hosted* — a hosted `.svg` passes every
> asset-hosting check and still ships blank icons, so that is the one case nothing else would catch.
> The pastel chip behind feature icons is a CSS table cell (`sections/why-partner.njk`), so its colour
> stays in the design system, not baked into the image.

> **Two heroes are pre-composited** because email clients can't overlap elements or honour CSS
> gradients across Gmail/Outlook:
> - **buyer** `hero-browser.png` = the browser mock with the "Comacpro.net" pill already composited in.
> - **supplier** `comacpro-machinery.jpg` = the machinery photo with the white left→right legibility
>   **scrim baked into the pixels** (a CSS gradient did not survive Gmail/Outlook).
>
> The intermediate source layers are not kept in the repo — regenerate these from the design file if
> the art changes.

Every image has `alt` + explicit `width`/`height` so blocked-image inboxes stay readable.

## Responsive: one breakpoint, three patterns

Email has **exactly two layout states** — desktop multi-column and mobile stack. There is no
sm/md/lg/xl scale here, and adding one **fails the build**: Outlook desktop reads no media query at
all, and the clients that do read one give you nothing per-device tuning can use.

**THE breakpoint is declared once**, in `src/design-system/head.njk`:

```njk
<mj-breakpoint width="480px" />
```

That is what makes every `mj-column` stack — MJML compiles it into the `min-width:480px` rules that
widen columns above it. The single `@media (max-width:479px)` block in the same file (479 = 480 − 1)
is the other half of the same breakpoint; `BREAKPOINT_PX` in `build/config.ts` is the one number both
are checked against, so they can't drift apart.

### The gap `mj-breakpoint` alone leaves

Two client families **strip `<style>`** before rendering, so they never see that media query:
**New Outlook / Outlook webview** (drops `@media` *and* the `[if mso]` ghost table) and **Gmail on a
non-Google account (GANGA)**. There MJML's columns stay at their inline `width:100%` and collapse to
one stack **even on a desktop-width screen**. So the breakpoint is necessary and not sufficient.

### Pattern A — real columns that stack: `mj-column` + `css-class="fluid"`

The default. Mark the column and nothing else:

```njk
<mj-column css-class="fluid" width="50%">…</mj-column>
```

`fluid` carries **no number**. At build time `applyFluidMaxWidth` reads the width MJML already wrote
into its own Outlook ghost table for that column and mirrors it onto the column as an inline
`max-width`. With MJML's inline `width:100%`, that gives side-by-side on a wide viewport and reflow
on a narrow one **with no media query** — so it holds in New Outlook and GANGA too. Below the
breakpoint the shared `.fluid` rule drops the cap for clean full-width stacking.

Because the pixel value is *derived from MJML's own layout pass*, changing a section's padding moves
it automatically. Nothing to keep in sync, no magic constant, and nothing for Nunjucks to compute.
If MJML's output ever changes shape, the build fails rather than silently shipping uncapped columns.

### Pattern B — a table that must NOT stack: `mj-table`

A line-item row is not a layout column. Use one `mj-table` with explicit cell widths and **no**
`fluid`; it reflows by wrapping the one cell that can afford to (`order-confirmation/sections/items.njk`).

### Pattern C — never-stack pairs: `mj-group`

`mj-group` emits an inline `width:%`, so its columns never stack at any width. Use it **only** for
that (the buyer proof-panel stats: two short numbers that read fine 2-across on a phone), never for
something that must reflow.

### Custom mobile styling

Put it in the **one** `max-width:479px` block, keyed on your own `css-class` — not on MJML's
generated `.mj-column-per-*` classes, which are shared by every column of the same percentage and
change when you change a width.

> **The one trap.** The shared `.fluid` mobile rule sets `display:block` (right for a column going
> full-width). If you narrow a `fluid` column so it sits **N-across** on mobile, you must also
> restore `display:inline-block !important` — a 50%-wide *block* still stacks vertically, so
> overriding the width alone gives you one column crammed into half the screen. That is what the
> `.eq-col, .feat-col` and `.step-col` rules do. It is invisible in the built HTML and only shows up
> in a render, so check `dist/` at 390px after adding an override. Remember what such rules can and cannot do: **Outlook desktop never
reads them**, and neither do New Outlook or GANGA, so mobile CSS is for polish (gutters, type sizes),
never for layout that has to hold. Layout lives in `fluid` + MJML.

Verify both stripped-CSS families in `dist/sim/` (written on every build) whenever you touch a
column's width or padding. Details + the real-send matrix: `docs/email-testing.md`.

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
- Buttons are MJML bulletproof buttons (VML-backed). Equipment/feature grids reflow via
  `css-class="fluid"` + the `.eq-col`/`.feat-col` mobile widths.
- **Colour scheme:** light-only, pinned for every email. Respected by Apple Mail, iOS Mail and
  Outlook.com. The **Gmail app on Android force-inverts light backgrounds regardless of any meta** —
  no HTML can prevent that, so a dark wordmark on a transparent logo still loses contrast there.
- Output stays under Gmail's 102 KB clip limit, measured on the **quoted-printable-encoded** body
  (the "sent" figure), not the raw file; the minified copy buys back ~30%.
- **Preheader** is padded (`design-system/preheader.njk`) so the client can't pull the greeting in
  after it.

## CI

- `build.yml` — on feature branches / PRs: `npm run validate` (the same gate as main, so a compat
  error can't pass review and first go red on the deploy).
- `pages.yml` — on `main`: `npm run validate`, then deploy `dist/` + the **asset files only** to
  GitHub Pages. Note the Pages site is public even when the repo is private, which is why only
  images are staged, never the `.ts`/`.njk` sources.
