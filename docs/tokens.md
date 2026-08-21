# Brand tokens — provenance & conventions

**Runtime source of truth: `src/design-system/tokens.ts`.** The build injects those values into every
template, so changing a colour there updates everywhere on rebuild.

**Every value is rendered live at `dist/tokens.html`** (generated FROM `tokens.ts` on each build —
open it from the gallery's *Design tokens ↗* link). That page is the reference; this document
deliberately does **not** repeat the values.

> Why not: this file used to carry the full colour / type / layout tables next to the instruction
> "keep the two in sync", and they drifted — four documented hexes (`#FEF1EB`, `#F6C6A6`, `#10233F`,
> `#25D366`) no longer existed, two live tokens were undocumented, the breakpoint was listed as
> 600px (it is 480), the button radius as 6px (it is 14), and a hero size that no template used.
> Hand-maintained copies of machine-readable data drift; the fix is to delete the copy, not to
> correct it. What stays here is what a generator cannot know: **where the values came from and why**.

## Provenance

Colours were sampled from the approved Figma design (coordinate-free extraction from the exported
design PNG — the Figma file was not shared with edit access). If edit access arrives, pull exact
`get_variable_defs` tokens and reconcile against `tokens.ts`.

## The two-tier orange — the one decision worth documenting

`#F37134` is the most vibrant brand orange and fails contrast as text (2.91:1 on white). It is
therefore **decorative only**: accent bars, section-title rules, the hero divider. Never text, never
a button fill.

Anything carrying meaning uses **`orangeStrong` `#E5641F`** (3.40:1 on white). That clears WCAG
**AA-large** and was accepted as a brand-vibrancy trade-off for large text.

**Know exactly what that trade-off does and does not cover.** AA-large starts at 18.66px bold /
24px regular. Measured against the sizes actually shipping:

| Where | Ratio | Verdict |
|---|---|---|
| Stat number, 26px/800 on `panelBg` | 3.00 | AA-large — at the line, no margin (19px/800 on mobile still qualifies) |
| Reassurance callout, 17px/700 on white | 3.40 | **below** AA-large's 18.66px threshold → needs 4.5 |
| Primary CTA label, white on `orangeStrong`, 15px/700 | 3.40 | **fails AA** — 15px bold is small text |
| Inline `comacpro.net` link, 15px | 3.40 | **fails AA** |
| Solid office badge, white on orange, 11px/700 | 3.40 | **fails AA** |
| `badge` tone `soft` (orange on `orangeSoftBg`) | 2.70 | **below AA-large** — currently unused by any email, but a live trap in the design system |

So the documented justification ("accepted for large text") holds for the stat numbers and nothing
else. Closing the gap without changing the design's character needs one darker step for
text-and-button orange only — around `#C9530F` (4.6:1 on white) — leaving `#F37134` / `#E5641F` for
decorative use. **That is a brand decision, not a build fix, and has not been made.** Recorded here
so it is a choice rather than an oversight.

## Scales & conventions

- **Radius** — a real token scale in `tokens.radius` (`sm · md · lg · pill`). The design-system
  components (button → `lg`, badge → `md`) and the `mj-button` head default consume it; new sections
  should reference `tokens.radius.*` instead of literal px.
- **Spacing** — follows a **4px rhythm** (4/8/12/16/20/24/32…). Kept as a convention, not a token
  map: with three emails a spacing scale would be config with no real consumer. Promote to
  `tokens.space` once several templates genuinely share values.
- **Type** — sizes are per-role and authored in the sections (body 15, small 13, meta 12, section
  title 16, greeting 17, hero 22–24). Same rationale as spacing.
- **Breakpoint** — *not* a token in `tokens.ts`. It lives in `BREAKPOINT_PX` (`build/config.ts`) and
  is declared to MJML by `<mj-breakpoint>` in `design-system/head.njk`, because it is a build
  invariant the pipeline verifies — not a brand value. See `docs/architecture.md` §9.
