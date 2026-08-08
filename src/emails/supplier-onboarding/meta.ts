import type { EmailMeta } from '../../../build/schema.ts';

// Build/ops metadata (content lives in content.ts). Validated against emailMetaSchema.
export const meta: EmailMeta = {
  category: 'marketing',
  subject: 'Reach qualified construction equipment buyers across Southeast Asia',

  // Merge keys the sending system must provide. The build reconciles this list against the
  // {{keys}} actually rendered — an undeclared key fails the build.
  requiredKeys: [
    'company_name',
    'create_store_url',
    'become_supplier_url',
    'sender_name',
    'sender_title',
    'sender_phone',
    'sender_whatsapp',
    'sender_email',
    'sender_avatar',
    'unsubscribe',
  ],

  // Preview-only overrides (real avatar so dist/*.preview.html looks like a sent email).
  previewSamples: {
    sender_avatar: '../src/emails/supplier-onboarding/assets/anna-avatar.png',
  },
};
