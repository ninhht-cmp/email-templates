// Snapshot tests: every email must build without MJML errors or undeclared merge keys, and its
// HTML must match the committed snapshot. Regenerate snapshots after an intended change with:
//   UPDATE_SNAPSHOTS=1 npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

import { EMAILS_DIR } from '../build/config.ts';
import { createEnv } from '../build/create-env.ts';
import { discoverEmails } from '../build/discover-emails.ts';
import { buildEmail } from '../build/build-email.ts';
import { tokens } from '../src/design-system/tokens.ts';

const env = createEnv();
const SNAPSHOT_DIR = 'test/__snapshots__';
const shouldUpdate = process.env.UPDATE_SNAPSHOTS === '1';

for (const name of discoverEmails(EMAILS_DIR)) {
  test(`${name}: builds cleanly and matches snapshot`, async () => {
    const result = await buildEmail(env, tokens, name, { minify: false });

    assert.deepEqual(result.mjmlErrors, [], 'no MJML errors');
    assert.deepEqual(result.keyErrors, [], 'no undeclared merge keys');

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
