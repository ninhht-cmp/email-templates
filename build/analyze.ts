// Read-only analysis of built HTML — extract facts, never mutate. Feeds the build's governance
// gates (merge-key reconciliation, asset-hosting checks). Unit-tested in test/build.test.ts.

/** Merge keys ({{ … }}) actually present in built HTML — used for key governance. */
export function extractMergeKeys(html: string): string[] {
  const found = html.match(/\{\{\s*[a-z0-9_]+\s*\}\}/gi) ?? [];
  return [...new Set(found.map((key) => key.replace(/\s/g, '')))].sort();
}

/**
 * Assets that will NOT load (or should not) in a real inbox: repo-relative paths, placehold.co
 * stand-ins, and — critically — images hosted on any non-prod host (a `*.dev` / staging CDN). The
 * last catches dev asset URLs that would otherwise ship silently; `prodHosts` is the allowlist.
 */
export function findUnhostedAssets(
  html: string,
  prodHosts: readonly string[],
): { relative: string[]; placeholder: string[]; nonProd: string[] } {
  const relative = [...new Set(html.match(/\.\.\/[^"')]+\.(?:png|jpe?g|gif|svg|webp)/gi) ?? [])];
  const placeholder = [...new Set(html.match(/https?:\/\/placehold\.co\/[^"')\s]+/gi) ?? [])];
  const hostedImages =
    html.match(/https?:\/\/[^\s"')]+\.(?:png|jpe?g|gif|svg|webp)(?:\?[^\s"')]*)?/gi) ?? [];
  const nonProd = [
    ...new Set(
      hostedImages.filter((url) => {
        const host = url.match(/^https?:\/\/([^/]+)/)?.[1] ?? '';
        return host !== '' && !prodHosts.includes(host);
      }),
    ),
  ];
  return { relative, placeholder, nonProd };
}
