// Content for the order-confirmation email. Parsed through contentSchema at import, so a wrong
// shape (missing field, wrong type) fails the build with a clear message.
//
// This template is the RESPONSIVE REFERENCE: it deliberately carries no art of its own (only the
// shared brand logo), so it renders fully offline and every layout pattern in it can be judged at
// desktop vs mobile width without hosting anything first. See sections/ for which pattern is which.

import { company, sharedAssets } from '../../blocks/shared-content.ts';
import { contentSchema, type OrderConfirmationContent } from './content.schema.ts';

export const content: OrderConfirmationContent = contentSchema.parse({
  document: {
    title: 'Your COMACPRO order is confirmed',
    // Transactional preheader: lead with the fact, not a pitch — this is the line that tells the
    // recipient at a glance that nothing is wrong.
    preview: 'Order {{order_number}} is confirmed. Here is your summary and what happens next.',
  },

  assets: { ...sharedAssets },

  headline: {
    title: 'Your order is confirmed',
    subline: 'Thank you — we have received your order and our team is preparing it now.',
  },

  // Label = ours (content). Value = the recipient's data, so it stays a merge key.
  orderFacts: [
    { label: 'Order number', key: 'order_number' },
    { label: 'Order date', key: 'order_date' },
    { label: 'Payment method', key: 'payment_method' },
    { label: 'Delivery to', key: 'delivery_city' },
  ],

  // Sample rows only — a real send loops these from the order (see sections/items.njk).
  lineItems: [
    { name: 'Komatsu PC200-8 excavator', qty: '1', price: 'USD 48,500' },
    { name: 'Hydraulic breaker attachment', qty: '2', price: 'USD 6,200' },
    { name: 'Inspection & documentation service', qty: '1', price: 'USD 850' },
  ],

  totals: [
    { label: 'Subtotal', value: 'USD 61,750', strong: false },
    { label: 'Inland freight', value: 'USD 1,900', strong: false },
    { label: 'Total', value: '{{order_total}}', strong: true },
  ],

  nextSteps: [
    { step: '1', title: 'Confirmation', desc: 'Our team verifies stock and documents.' },
    { step: '2', title: 'Payment', desc: 'We send the invoice and payment instructions.' },
    { step: '3', title: 'Inspection', desc: 'Optional third-party inspection on request.' },
    { step: '4', title: 'Shipping', desc: 'Loading, export papers and tracking details.' },
  ],

  support: {
    text: 'Something not right with this order? Reply to this email or reach us directly — a real person handles every order.',
    cta: 'VIEW ORDER STATUS',
  },

  company,
  // Transactional source basis: the recipient asked for this email by placing an order, which is a
  // different (and stronger) lawful basis than the cold marketing list — so it says so plainly, and
  // blocks/footer.njk renders NO unsubscribe for a transactional category.
  compliance: {
    sourceBasis:
      'You are receiving this email because you placed an order with COMACPRO. It is a transactional message about that order, not marketing.',
  },
});
