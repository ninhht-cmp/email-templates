import { existsSync, readdirSync, statSync } from 'node:fs';

/**
 * Discover emails by folder convention: any `<emailsDir>/<name>/` that contains an
 * `index.mjml.njk` entry. No central registry — drop a folder in and it builds.
 */
export function discoverEmails(emailsDir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(emailsDir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => {
      const dir = `${emailsDir}/${name}`;
      return statSync(dir).isDirectory() && existsSync(`${dir}/index.mjml.njk`);
    })
    .sort();
}
