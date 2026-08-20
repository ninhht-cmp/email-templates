// Build entry: discover emails, build each, write HTML + preview gallery.
//
//   Nunjucks {$ … $} = build-time   ·   {{ … }} = send-time merge fields (untouched)
//
// The build is the quality gate: invalid meta, MJML errors, or undeclared merge keys fail it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tokens } from '../src/design-system/tokens.ts';
import { buildEmail } from './build-email.ts';
import { EMAILS_DIR, GMAIL_CLIP_KB, OUT_DIR } from './config.ts';
import { createEnv } from './create-env.ts';
import { discoverEmails } from './discover-emails.ts';
import { previewSamples } from './preview-samples.ts';
import { tokensSchema } from './schema.ts';
import { type BuiltEmail, writeGallery } from './write-gallery.ts';
import { type KeysDocEmail, keyDescriptions, writeKeysDoc } from './write-keys-doc.ts';
import { writeTokensPage } from './write-tokens-page.ts';

const minify = process.env.MINIFY === '1' || process.argv.includes('--minify');
const env = createEnv();

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const emailNames = discoverEmails(EMAILS_DIR);
  if (emailNames.length === 0) {
    console.error(`No emails found in ${EMAILS_DIR}`);
    process.exit(1);
  }

  let failed = false;
  const built: BuiltEmail[] = [];
  const keysDoc: KeysDocEmail[] = [];
  const minByEmail: Record<string, string> = {}; // shippable minified HTML, for the gallery copy/customize

  for (const name of emailNames) {
    try {
      const result = await buildEmail(env, tokens, name, { minify });

      for (const message of result.mjmlErrors) {
        failed = true;
        console.error(`✗ ${name}: MJML — ${message}`);
      }
      for (const message of result.keyErrors) {
        failed = true;
        console.error(`✗ ${name}: ${message}`);
      }
      for (const message of result.keyWarnings) console.warn(`  ⚠ ${name}: ${message}`);
      for (const message of result.metaWarnings) console.warn(`  ⚠ ${name}: ${message}`);

      if (result.unhostedAssets.length > 0) {
        console.warn(
          `  ⚠ ${name}: ${result.unhostedAssets.length} asset(s) still temporary — swap in content.ts before sending:`,
        );
        for (const url of result.unhostedAssets) console.warn(`      · ${url}`);
      }

      writeFileSync(`${OUT_DIR}/${name}.html`, result.html); // shippable (raw {{keys}})
      writeFileSync(`${OUT_DIR}/${name}.min.html`, result.minHtml); // shippable, minified (gallery copy)
      writeFileSync(`${OUT_DIR}/${name}.preview.html`, result.previewHtml); // sample-filled preview
      const clip = Number(result.kb) > GMAIL_CLIP_KB ? '  ⚠ over Gmail 102KB clip limit' : '';
      console.log(`✓ ${OUT_DIR}/${name}.html  (${result.kb} KB · ${result.category})${clip}`);
      built.push({ name, kb: result.kb, category: result.category });
      minByEmail[name] = result.minHtml;
      keysDoc.push({
        name,
        category: result.category,
        subject: result.subject,
        requiredKeys: result.requiredKeys,
      });
    } catch (error) {
      failed = true;
      console.error(`✗ ${name}: ${(error as Error).message}`);
    }
  }

  const builtAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  // Per-email merge keys + descriptions for the gallery's "Merge keys" modal.
  const keysByEmail = Object.fromEntries(
    keysDoc.map((e) => [
      e.name,
      e.requiredKeys.map((key) => ({ key, description: keyDescriptions[key] ?? '' })),
    ]),
  );
  writeGallery(OUT_DIR, built, builtAt, keysByEmail, minByEmail, previewSamples);
  console.log(`✓ ${OUT_DIR}/index.html  (preview gallery)`);
  writeKeysDoc(OUT_DIR, keysDoc, builtAt);
  console.log(`✓ ${OUT_DIR}/KEYS.md  (merge-key reference)`);
  writeTokensPage(OUT_DIR, tokensSchema.parse(tokens), builtAt);
  console.log(`✓ ${OUT_DIR}/tokens.html  (design-token reference)`);

  if (failed) {
    console.error('\nBuild failed: fix the issues above.');
    process.exit(1);
  }
  console.log('\nBuild OK.');
}

await main();
