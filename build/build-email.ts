import { pathToFileURL } from 'node:url';
import type { Environment } from 'nunjucks';
import { EMAILS_DIR } from './config.ts';
import { tokensSchema } from './schema.ts';
import { renderEmail, findUnhostedAssets } from './render-email.ts';
import { validateMeta, reconcileMergeKeys } from './validate-email.ts';

export interface EmailBuildResult {
  name: string;
  html: string;
  kb: string;
  category: string;
  mjmlErrors: string[];
  keyErrors: string[];
  keyWarnings: string[];
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

  const { html, errors } = await renderEmail(
    env,
    `emails/${name}/index.mjml.njk`,
    { tokens, content, meta },
    options,
  );

  const { errors: keyErrors, warnings: keyWarnings } = reconcileMergeKeys(html, meta.requiredKeys);
  const { relative, placeholder } = findUnhostedAssets(html);

  return {
    name,
    html,
    kb: (Buffer.byteLength(html) / 1024).toFixed(1),
    category: meta.category,
    mjmlErrors: errors.map((error) => error.formattedMessage ?? error.message),
    keyErrors,
    keyWarnings,
    unhostedAssets: [...relative, ...placeholder],
  };
}
