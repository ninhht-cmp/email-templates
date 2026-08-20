// Unit tests for the build's pure guardrails — the functions that gate quality (merge-key
// governance, meta/compliance rules, the fluid-hybrid injection, asset hosting, client simulation).
// The snapshot test covers end-to-end HTML; these pin the logic so a regression fails loudly.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyFluidMaxWidth,
  extractMergeKeys,
  findUnhostedAssets,
  stripMediaQueries,
  stripStyleBlocks,
} from '../build/render-email.ts';
import { emailMetaSchema } from '../build/schema.ts';
import { metaAdvisories, reconcileMergeKeys } from '../build/validate-email.ts';

test('extractMergeKeys: dedupes, sorts, and allows digits', () => {
  const html = '<a>{{ sender_name }}</a> {{url2}} {{sender_name}} {{buyer_name}}';
  assert.deepEqual(extractMergeKeys(html), ['{{buyer_name}}', '{{sender_name}}', '{{url2}}']);
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

test('applyFluidMaxWidth: injects inline max-width from an mw-<px> class', () => {
  const div =
    '<div class="mj-column-per-50 cta-col mw-261" style="width:100%;display:inline-block;">x</div>';
  assert.match(applyFluidMaxWidth(div), /style="max-width:261px;width:100%/);
});

test('applyFluidMaxWidth: leaves non-mw columns and style-less divs untouched', () => {
  const other = '<div class="mj-column-per-50" style="width:100%;">x</div>';
  assert.equal(applyFluidMaxWidth(other), other);
  const noStyle = '<div class="mw-100">x</div>'; // no style attr → nothing to inject, must not crash
  assert.equal(applyFluidMaxWidth(noStyle), noStyle);
});

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
