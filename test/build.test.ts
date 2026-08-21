// Unit tests for the build's pure guardrails — the functions that gate quality (merge-key
// governance, meta/compliance rules, the fluid-hybrid injection, breakpoint discipline, asset
// hosting, client simulation).
// The snapshot test covers end-to-end HTML; these pin the logic so a regression fails loudly.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractImageRefs,
  extractMergeKeys,
  findSvgImages,
  findUnhostedAssets,
} from '../build/analyze.ts';
import { BREAKPOINT_PX } from '../build/config.ts';
import {
  applyFluidMaxWidth,
  collectBreakpoints,
  stripMediaQueries,
  stripStyleBlocks,
} from '../build/html-transforms.ts';
import { emailMetaSchema } from '../build/schema.ts';
import {
  assertFluidInjected,
  assertSingleBreakpoint,
  metaAdvisories,
  reconcileMergeKeys,
  requireOptOut,
} from '../build/validate-email.ts';
import { htmlToText } from '../build/write-text.ts';

test('extractMergeKeys: dedupes, sorts, allows digits, and sees {{#if}} conditions', () => {
  const html = '<a>{{ sender_name }}</a> {{url2}} {{sender_name}} {{buyer_name}}';
  assert.deepEqual(extractMergeKeys(html), ['{{buyer_name}}', '{{sender_name}}', '{{url2}}']);
  // A key used ONLY as a conditional still has to exist in the sending system — it used to slip past.
  assert.deepEqual(extractMergeKeys('{{#if promo_block}}hi{{/if}}'), ['{{promo_block}}']);
  // The block closer is not a key.
  assert.equal(extractMergeKeys('{{#if a}}x{{/if}}').includes('{{/if}}'), false);
});

test('reconcileMergeKeys: undeclared key is an error, unused declared key is a warning', () => {
  const html = '{{sender_name}} {{sender_email}}';
  const { errors, warnings } = reconcileMergeKeys(html, ['sender_name', 'unsubscribe']);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? '', /sender_email/); // used but not declared
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] ?? '', /unsubscribe/); // declared but never rendered
});

test('reconcileMergeKeys: clean when declared === rendered', () => {
  const { errors, warnings } = reconcileMergeKeys('{{a}} {{b}}', ['a', 'b']);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

// ── Fluid-hybrid: the max-width is READ FROM MJML's ghost table, never hand-typed ──────────────
const ghost = (px: number, cls = 'fluid') =>
  `<!--[if mso | IE]><table><tr><td class="${cls}-outlook" style="vertical-align:middle;width:${px}px;" ><![endif]-->`;

test('applyFluidMaxWidth: mirrors the ghost-table width onto the column div', () => {
  const html = `${ghost(268)}<div class="mj-column-per-50 cta-col fluid" style="width:100%;display:inline-block;">x</div>`;
  const result = applyFluidMaxWidth(html);
  assert.match(result.html, /style="max-width:268px;width:100%/);
  assert.deepEqual([result.marked, result.injected], [1, 1]);
});

test('applyFluidMaxWidth: each column takes its OWN preceding ghost width', () => {
  const html =
    `${ghost(252)}<div class="hero-col fluid" style="width:100%;">a</div>` +
    `${ghost(348)}<div class="hero-col fluid" style="width:100%;">b</div>`;
  const { html: out, marked, injected } = applyFluidMaxWidth(html);
  assert.match(out, /max-width:252px;width:100%;">a/);
  assert.match(out, /max-width:348px;width:100%;">b/);
  assert.deepEqual([marked, injected], [2, 2]);
});

test('applyFluidMaxWidth: "fluid-outlook" on the ghost td is not itself a fluid column', () => {
  // `fluid` is a whole-token match: the -outlook suffixed class on the ghost cell must not count,
  // or every column would be double-counted and the marked/injected assertion would be meaningless.
  const { marked } = applyFluidMaxWidth(ghost(100));
  assert.equal(marked, 0);
});

test('applyFluidMaxWidth: leaves non-fluid columns alone and reports a miss instead of guessing', () => {
  const other = '<div class="mj-column-per-50" style="width:100%;">x</div>';
  assert.equal(applyFluidMaxWidth(other).html, other);

  // A fluid column with no ghost width in front of it must be REPORTED, not silently skipped —
  // that is the failure mode that only shows up in New Outlook / Gmail-GANGA.
  const orphan = '<div class="fluid" style="width:100%;">x</div>';
  const result = applyFluidMaxWidth(orphan);
  assert.equal(result.html, orphan);
  assert.deepEqual([result.marked, result.injected], [1, 0]);
  assert.equal(assertFluidInjected(result).length, 1);
  assert.equal(assertFluidInjected({ html: '', marked: 3, injected: 3 }).length, 0);
});

// ── One breakpoint, not a scale ────────────────────────────────────────────────────────────────
test('collectBreakpoints: reports every distinct media-query width', () => {
  const html =
    '<style>@media only screen and (min-width:480px){.a{x:1}}' +
    '@media only screen and (max-width:479px){.b{y:2}}' +
    '@media only screen and (max-width:359px){.c{z:3}}</style>';
  assert.deepEqual(collectBreakpoints(html), { min: [480], max: [359, 479] });
});

test('assertSingleBreakpoint: accepts the one breakpoint + its mirror, rejects a third', () => {
  const ok = `@media (min-width:${BREAKPOINT_PX}px){} @media (max-width:${BREAKPOINT_PX - 1}px){}`;
  assert.deepEqual(assertSingleBreakpoint(ok), []);

  // A sub-360 tier is web-CSS sm/md/lg thinking; email has two states.
  const extra = `${ok} @media (max-width:359px){}`;
  assert.equal(assertSingleBreakpoint(extra).length, 1);
  assert.match(assertSingleBreakpoint(extra)[0] ?? '', /359/);

  // mj-breakpoint and the hand-written mobile block drifting apart leaves a dead band.
  const drifted = `@media (min-width:${BREAKPOINT_PX}px){} @media (max-width:600px){}`;
  assert.equal(assertSingleBreakpoint(drifted).length, 1);
});

// ── Meta / compliance ──────────────────────────────────────────────────────────────────────────
test('emailMetaSchema: adLabel is enforced at position 0 only when set', () => {
  const base = { category: 'marketing', requiredKeys: [] } as const;
  assert.equal(emailMetaSchema.safeParse({ ...base, subject: 'Hello' }).success, true); // no label → ok
  assert.equal(
    emailMetaSchema.safeParse({ ...base, subject: '[QC] Hello', adLabel: '[QC]' }).success,
    true,
  );
  assert.equal(
    emailMetaSchema.safeParse({ ...base, subject: 'Hello', adLabel: '[QC]' }).success,
    false, // label set but missing from subject
  );
  assert.equal(
    emailMetaSchema.safeParse({ ...base, subject: 'x', adLabel: '[QQ]' }).success,
    false, // invalid label value
  );
});

test('metaAdvisories: warns only for a marketing email with no adLabel', () => {
  assert.equal(metaAdvisories({ category: 'marketing', subject: 'x', requiredKeys: [] }).length, 1);
  assert.equal(
    metaAdvisories({ category: 'marketing', subject: '[QC] x', adLabel: '[QC]', requiredKeys: [] })
      .length,
    0,
  );
  assert.equal(
    metaAdvisories({ category: 'transactional', subject: 'Your receipt', requiredKeys: [] }).length,
    0,
  );
});

test('requireOptOut: a marketing email without an opt-out fails; transactional is exempt', () => {
  const marketing = { category: 'marketing', subject: 'x' } as const;

  // Declared AND rendered → fine.
  assert.deepEqual(
    requireOptOut({ ...marketing, requiredKeys: ['unsubscribe'] }, 'a {{unsubscribe}} b'),
    [],
  );
  // Rendered but never declared: the key list lies about what the send needs.
  assert.equal(requireOptOut({ ...marketing, requiredKeys: [] }, '{{unsubscribe}}').length, 1);
  // Declared but the footer block was dropped from the registry — the send has no way out at all.
  assert.equal(
    requireOptOut({ ...marketing, requiredKeys: ['unsubscribe'] }, '<p>no footer</p>').length,
    1,
  );
  // A receipt must NOT offer to unsubscribe from receipts.
  assert.deepEqual(
    requireOptOut({ category: 'transactional', subject: 'x', requiredKeys: [] }, '<p>hi</p>'),
    [],
  );
});

// ── Assets ─────────────────────────────────────────────────────────────────────────────────────
test('findUnhostedAssets: flags non-prod hosts, repo-relative paths and placeholders', () => {
  const html = [
    'a=https://storage.dev.cmpup.com/x/logo.webp',
    'b=https://storage.comacpro.net/x/excavator.png?w=64',
    'c=../src/emails/x/assets/anna.png',
    'd=https://placehold.co/152x152/000/fff?text=AP',
  ].join(' ');
  const { relative, placeholder, nonProd } = findUnhostedAssets(html, [
    'storage.comacpro.net',
    'flagcdn.com',
  ]);
  assert.deepEqual(nonProd, ['https://storage.dev.cmpup.com/x/logo.webp']); // dev host flagged
  assert.equal(
    nonProd.some((u) => u.includes('storage.comacpro.net')),
    false,
  ); // prod host not flagged
  assert.equal(relative.length, 1);
  assert.equal(placeholder.length, 1);
});

test('extractImageRefs: reads the width ATTRIBUTE and keeps the largest use of an asset', () => {
  const html =
    '<img src="a.png" width="26" height="26"><img src="a.png" width="52" height="52">' +
    '<img src="b.png" style="width:80px"><img alt="no src">';
  assert.deepEqual(extractImageRefs(html), [
    { src: 'a.png', width: 52 }, // largest render wins — that is the size it must be sharp at
    { src: 'b.png', width: null }, // CSS-only sizing: nothing to assert against
  ]);
});

test('findSvgImages: only <img> SVGs, query strings included', () => {
  const html =
    '<img src="../a/icon.svg" width="26"><img src="https://cdn.x/y.svg?v=2" width="15">' +
    '<img src="ok.png" width="10">';
  assert.deepEqual(findSvgImages(html), ['../a/icon.svg', 'https://cdn.x/y.svg?v=2']);
});

// ── Client-family simulation ───────────────────────────────────────────────────────────────────
test('stripMediaQueries / stripStyleBlocks: remove the right thing, keep the rest', () => {
  const html =
    '<style>.a{color:red}@media (min-width:480px){.a{color:blue}.b{x:1}}.c{y:2}</style><div>hi</div>';
  const noMedia = stripMediaQueries(html);
  assert.equal(noMedia.includes('@media'), false);
  assert.equal(noMedia.includes('.a{color:red}'), true); // non-media rule survives
  assert.equal(noMedia.includes('.c{y:2}'), true);
  const noStyle = stripStyleBlocks(html);
  assert.equal(noStyle.includes('<style'), false);
  assert.equal(noStyle.includes('<div>hi</div>'), true);
});

// ── Plain-text part ────────────────────────────────────────────────────────────────────────────
test('htmlToText: keeps merge keys raw and link targets visible', () => {
  const html =
    '<div>Dear {{company_name}},</div>' +
    '<div><a href="{{cta_url}}">CREATE YOUR STORE</a></div>' +
    '<div><a href="https://comacpro.net/">comacpro.net</a></div>' +
    '<div><a href="mailto:a@b.co">a@b.co</a></div>';
  const text = htmlToText(html);
  assert.match(text, /Dear \{\{company_name\}\},/);
  // The URL must SURVIVE — wrapping it in <> got it eaten by the tag stripper.
  assert.match(text, /CREATE YOUR STORE \(\{\{cta_url\}\}\)/);
  // A label that already is the destination is not repeated.
  assert.match(text, /^comacpro\.net$/m);
  assert.match(text, /^a@b\.co$/m);
});

test('htmlToText: drops the hidden preheader, Outlook conditionals, and duplicate alt text', () => {
  const html =
    '<div style="display:none;max-height:0">Preheader copy</div>' +
    '<!--[if mso]><v:oval></v:oval><![endif]-->' +
    '<style>.a{color:red}</style>' +
    '<div><img src="x.png" alt="Excavators"></div><div>Excavators</div>' +
    '<div><img src="y.png" alt=""></div><div>Body &amp; more&nbsp;copy</div>';
  const text = htmlToText(html);
  assert.equal(text.includes('Preheader copy'), false);
  assert.equal(text.includes('v:oval'), false);
  assert.equal(text.includes('color:red'), false);
  assert.equal(text.includes('[Excavators]'), false); // deduped against the visible label below it
  assert.match(text, /^Excavators$/m);
  assert.match(text, /Body & more copy/);
});
