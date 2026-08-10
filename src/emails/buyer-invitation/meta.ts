import type { EmailMeta } from '../../../build/schema.ts';

// Build/ops metadata (content lives in content.ts). Validated against emailMetaSchema.
export const meta: EmailMeta = {
  category: 'marketing',
  subject: 'Find reliable used construction equipment for your upcoming projects',

  // Merge keys the sending system must provide. The build reconciles this list against the
  // {{keys}} actually rendered — an undeclared key fails the build.
  requiredKeys: [
    'buyer_name',
    'explore_equipment_url',
    'register_url',
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
    sender_avatar: '../src/emails/buyer-invitation/assets/anna-avatar.png',
  },
};
