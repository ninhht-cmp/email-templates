import type { EmailMeta } from '../../../build/schema.ts';

// Build/ops metadata (content lives in content.ts). Validated against emailMetaSchema.
//
// category: 'transactional' — and that single field changes real behaviour, which is the point of
// having it: blocks/footer.njk renders NO unsubscribe clause (offering to opt out of your own order
// receipt would be wrong), and validate-email.ts skips the marketing opt-out + advertising-label
// checks instead of warning about a label this email must not carry.
export const meta: EmailMeta = {
  category: 'transactional',
  subject: 'Your COMACPRO order {{order_number}} is confirmed',

  requiredKeys: [
    'buyer_name',
    'order_number',
    'order_date',
    'payment_method',
    'delivery_city',
    'order_total',
    'order_status_url',
  ],

  previewSamples: {
    order_number: 'CMP-2026-04817',
    order_date: '21 August 2026',
    payment_method: 'Telegraphic transfer (T/T)',
    delivery_city: 'Hai Phong, Vietnam',
    order_total: 'USD 63,650',
    order_status_url: 'https://comacpro.net/orders/CMP-2026-04817',
  },
};
