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
