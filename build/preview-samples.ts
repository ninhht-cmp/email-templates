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
  unsubscribe: 'https://comacpro.net/unsubscribe',
};

/** Replace {{key}} with its sample value; keys with no sample are left literal. */
export function fillSamples(html: string, samples: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => samples[key] ?? match);
}
