// Snapshot tests: every email must build without MJML errors or undeclared merge keys, and its
// HTML must match the committed snapshot. Regenerate snapshots after an intended change with:
//   UPDATE_SNAPSHOTS=1 npm test

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildEmail } from '../build/build-email.ts';
import { EMAILS_DIR } from '../build/config.ts';
import { createEnv } from '../build/create-env.ts';
import { discoverEmails } from '../build/discover-emails.ts';
import { tokens } from '../src/design-system/tokens.ts';

const env = createEnv();
const SNAPSHOT_DIR = 'test/__snapshots__';
const shouldUpdate = process.env.UPDATE_SNAPSHOTS === '1';

for (const name of discoverEmails(EMAILS_DIR)) {
  test(`${name}: builds cleanly and matches snapshot`, async () => {
    const result = await buildEmail(env, tokens, name, { minify: false });

    assert.deepEqual(result.mjmlErrors, [], 'no MJML errors');
    assert.deepEqual(result.keyErrors, [], 'no undeclared merge keys');
    // One breakpoint, and every `fluid` column carries its inline max-width.
    assert.deepEqual(result.layoutErrors, [], 'layout invariants hold');
    // A marketing email has a working opt-out.
    assert.deepEqual(result.complianceErrors, [], 'opt-out present where required');
    // Regression guard for the fluid-hybrid refactor: every marked column got a real px cap, so a
    // silent "injected nothing" can never pass as a clean build.
    const capped = result.html.match(/class="[^"]*\bfluid\b[^"]*" style="max-width:\d+px;/g) ?? [];
    const marked = result.html.match(/<div[^>]*class="[^"]*\bfluid\b[^"]*"/g) ?? [];
    assert.equal(capped.length, marked.length, 'every fluid column has an inline max-width');

    const snapshotPath = `${SNAPSHOT_DIR}/${name}.html`;
    if (shouldUpdate || !existsSync(snapshotPath)) {
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
      writeFileSync(snapshotPath, result.html);
      return;
    }
    assert.equal(
      result.html,
      readFileSync(snapshotPath, 'utf8'),
      `HTML differs from snapshot — run "UPDATE_SNAPSHOTS=1 npm test" if intended`,
    );
  });
}
