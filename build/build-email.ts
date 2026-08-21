import { pathToFileURL } from 'node:url';
import type { Environment } from 'nunjucks';
import { findUnhostedAssets } from './analyze.ts';
import { type AssetAdvisory, checkAssets } from './check-assets.ts';
import { EMAILS_DIR, PROD_ASSET_HOSTS, QP_OVERHEAD } from './config.ts';
import { applyFluidMaxWidth } from './html-transforms.ts';
import { fillSamples, previewSamples } from './preview-samples.ts';
import { renderEmail } from './render-email.ts';
import { tokensSchema } from './schema.ts';
import {
  assertFluidInjected,
  assertSingleBreakpoint,
  metaAdvisories,
  reconcileMergeKeys,
  requireOptOut,
  validateMeta,
} from './validate-email.ts';
import { buildTextPart } from './write-text.ts';

export interface EmailBuildResult {
  name: string;
  html: string; // shippable — raw {{keys}} intact, beautified
  minHtml: string; // shippable, minified — served for the gallery's "copy minified" action
  previewHtml: string; // sample values filled in — for visual review only
  text: string; // text/plain alternative part
  kb: string;
  /** Minified size as the recipient's client measures it: quoted-printable-encoded. */
  shippableKb: string;
  category: string;
  subject: string;
  preview: string;
  requiredKeys: string[];
  previewSamples: Record<string, string> | undefined;
  mjmlErrors: string[];
  keyErrors: string[];
  layoutErrors: string[];
  complianceErrors: string[];
  keyWarnings: string[];
  metaWarnings: string[];
  unhostedAssets: string[];
  assetAdvisories: AssetAdvisory[];
}

async function loadExport<T>(modulePath: string, exportName: string): Promise<T> {
  const module = (await import(pathToFileURL(modulePath).href)) as Record<string, T>;
  const value = module[exportName];
  if (value === undefined) throw new Error(`${modulePath} must export "${exportName}"`);
  return value;
}

/** The document-level content every email carries (validated per email by its own contentSchema). */
interface DocumentContent {
  document: { title: string; preview: string };
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
  const fluid = applyFluidMaxWidth(rawHtml);
  const html = fluid.html;

  // Also emit a minified copy (same source, MJML minify — keeps MSO conditional comments intact).
  const { html: rawMin } = await renderEmail(
    env,
    `emails/${name}/index.mjml.njk`,
    { tokens, content, meta },
    { minify: true },
  );
  const minFluid = applyFluidMaxWidth(rawMin);
  const minHtml = minFluid.html;

  const { errors: keyErrors, warnings: keyWarnings } = reconcileMergeKeys(html, meta.requiredKeys);
  const { relative, placeholder, nonProd } = findUnhostedAssets(html, PROD_ASSET_HOSTS);

  const previewHtml = fillSamples(html, { ...previewSamples, ...(meta.previewSamples ?? {}) });
  const text = buildTextPart(meta.subject, html);

  return {
    name,
    html,
    minHtml,
    previewHtml,
    text,
    kb: (Buffer.byteLength(html) / 1024).toFixed(1),
    shippableKb: ((Buffer.byteLength(minHtml) * QP_OVERHEAD) / 1024).toFixed(1),
    category: meta.category,
    subject: meta.subject,
    preview: (content as DocumentContent).document.preview,
    requiredKeys: meta.requiredKeys,
    previewSamples: meta.previewSamples,
    mjmlErrors: errors.map((error) => error.formattedMessage ?? error.message),
    keyErrors,
    // Layout invariants: one breakpoint, and every `fluid` column actually got its max-width.
    layoutErrors: [
      ...assertSingleBreakpoint(html),
      ...assertFluidInjected(fluid),
      ...assertFluidInjected(minFluid).map((m) => `[minified] ${m}`),
    ],
    complianceErrors: requireOptOut(meta, html),
    keyWarnings,
    metaWarnings: metaAdvisories(meta),
    unhostedAssets: [...relative, ...placeholder, ...nonProd],
    assetAdvisories: checkAssets(html, previewHtml),
  };
}
