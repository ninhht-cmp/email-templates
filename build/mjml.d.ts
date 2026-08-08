// Minimal ambient types for MJML v5 (ships no first-class types for this entrypoint).
declare module 'mjml' {
  interface MjmlError {
    message: string;
    formattedMessage?: string;
  }
  interface MjmlResult {
    html: string;
    errors: MjmlError[];
  }
  interface MjmlOptions {
    validationLevel?: 'strict' | 'soft' | 'skip';
    keepComments?: boolean;
    minify?: boolean;
    beautify?: boolean;
    filePath?: string;
  }
  export default function mjml2html(input: string, options?: MjmlOptions): Promise<MjmlResult>;
}
