import { pathToFileURL } from 'node:url';
import type { Environment } from 'nunjucks';
import { EMAILS_DIR, PROD_ASSET_HOSTS } from './config.ts';
import { fillSamples, previewSamples } from './preview-samples.ts';
import { applyFluidMaxWidth, findUnhostedAssets, renderEmail } from './render-email.ts';
import { tokensSchema } from './schema.ts';
import { metaAdvisories, reconcileMergeKeys, validateMeta } from './validate-email.ts';

export interface EmailBuildResult {
  name: string;
  html: string; // shippable — raw {{keys}} intact
  previewHtml: string; // sample values filled in — for visual review only
  kb: string;
  category: string;
  subject: string;
  requiredKeys: string[];
  mjmlErrors: string[];
  keyErrors: string[];
  keyWarnings: string[];
  metaWarnings: string[];
  unhostedAssets: string[];
}

async function loadExport<T>(modulePath: string, exportName: string): Promise<T> {
  const module = (await import(pathToFileURL(modulePath).href)) as Record<string, T>;
  const value = module[exportName];
  if (value === undefined) throw new Error(`${modulePath} must export "${exportName}"`);
  return value;
}

/**
 * Build a single email end-to-end: load content + meta, validate, render, reconcile keys.
 * Pure with respect to the filesystem output — it returns the result; the caller decides
 * whether to write it. Shared by the build script and the snapshot tests.
 */
export async function buildEmail(
  env: Environment,
  rawTokens: unknown,
  name: string,
  options: { minify: boolean },
): Promise<EmailBuildResult> {
  const tokens = tokensSchema.parse(rawTokens);
  const dir = `${EMAILS_DIR}/${name}`;

  const content = await loadExport<unknown>(`${dir}/content.ts`, 'content');
  const meta = validateMeta(await loadExport<unknown>(`${dir}/meta.ts`, 'meta'), name);

  const { html: rawHtml, errors } = await renderEmail(
    env,
    `emails/${name}/index.mjml.njk`,
    { tokens, content, meta },
    options,
  );
  // Inject inline max-width onto fluid-hybrid columns (see applyFluidMaxWidth) — must run before
  // key reconciliation / preview fill so every downstream copy has it.
  const html = applyFluidMaxWidth(rawHtml);

  const { errors: keyErrors, warnings: keyWarnings } = reconcileMergeKeys(html, meta.requiredKeys);
  const { relative, placeholder, nonProd } = findUnhostedAssets(html, PROD_ASSET_HOSTS);

  const previewHtml = fillSamples(html, { ...previewSamples, ...(meta.previewSamples ?? {}) });

  return {
    name,
    html,
    previewHtml,
    kb: (Buffer.byteLength(html) / 1024).toFixed(1),
    category: meta.category,
    subject: meta.subject,
    requiredKeys: meta.requiredKeys,
    mjmlErrors: errors.map((error) => error.formattedMessage ?? error.message),
    keyErrors,
    keyWarnings,
    metaWarnings: metaAdvisories(meta),
    unhostedAssets: [...relative, ...placeholder, ...nonProd],
  };
}
