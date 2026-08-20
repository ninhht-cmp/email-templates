// Sample merge-field values used ONLY for the preview build (dist/<name>.preview.html).
// The shippable dist/<name>.html keeps the raw {{keys}} untouched for the sending system.
// An email can override/extend these via `meta.previewSamples`.
export const previewSamples: Record<string, string> = {
  company_name: 'Dong A Machinery Co., Ltd',
  buyer_name: 'Mr. Nguyen Van An',
  sender_name: 'Anna Pham',
  sender_title: 'Marketplace Success Executive',
  sender_phone: '(+84) 967 442 348',
  sender_whatsapp: '84967442348',
  sender_email: 'seller@comacpro.net',
  sender_avatar: 'https://placehold.co/152x152/143E69/FFFFFF?text=AP',
  create_store_url: 'https://comacpro.net/register',
  become_supplier_url: 'https://comacpro.net',
  explore_equipment_url: 'https://comacpro.net/equipment',
  register_url: 'https://comacpro.net/register',
  unsubscribe: 'https://comacpro.net/unsubscribe',
};

/**
 * Render the preview: evaluate Handlebars `{{#if key}}…{{/if}}` blocks (kept only when a sample for
 * `key` exists — mirroring how the sending system shows the block only when it provides that value),
 * then replace `{{key}}` with its sample (keys with no sample are left literal). PREVIEW ONLY — the
 * shippable HTML keeps the raw `{{#if}}` / `{{key}}` for the sending system to evaluate.
 */
export function fillSamples(html: string, samples: Record<string, string>): string {
  return html
    .replace(
      /\{\{#if\s+([a-z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/gi,
      (_m, key: string, inner: string) => (samples[key] ? inner : ''),
    )
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (match, key: string) => samples[key] ?? match);
}
