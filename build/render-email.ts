import mjml2html from 'mjml';
import type { Environment } from 'nunjucks';

export interface RenderContext {
  tokens: unknown;
  content: unknown;
  meta: unknown;
}

export interface RenderResult {
  html: string;
  errors: { message: string; formattedMessage?: string }[];
}

/** Render one email entry: Nunjucks -> MJML -> inline HTML (mjml2html is async in v5). */
export async function renderEmail(
  env: Environment,
  entryPath: string,
  context: RenderContext,
  options: { minify: boolean },
): Promise<RenderResult> {
  const mjmlSource = env.render(entryPath, context as object);
  return mjml2html(mjmlSource, {
    validationLevel: 'soft',
    keepComments: true, // preserve MSO conditional comments (e.g. the avatar VML for Outlook)
    minify: options.minify,
    beautify: !options.minify,
    filePath: 'src',
  });
}

/** Merge keys ({{ … }}) actually present in built HTML — used for key governance. */
export function extractMergeKeys(html: string): string[] {
  const found = html.match(/\{\{\s*[a-z_]+\s*\}\}/gi) ?? [];
  return [...new Set(found.map((key) => key.replace(/\s/g, '')))].sort();
}

/** Assets that will NOT load in a real inbox (repo-relative paths or placeholders). */
export function findUnhostedAssets(html: string): { relative: string[]; placeholder: string[] } {
  const relative = [...new Set(html.match(/\.\.\/[^"')]+\.(?:png|jpe?g|gif|svg|webp)/gi) ?? [])];
  const placeholder = [...new Set(html.match(/https?:\/\/placehold\.co\/[^"')\s]+/gi) ?? [])];
  return { relative, placeholder };
}
