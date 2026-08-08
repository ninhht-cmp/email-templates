import type { EmailMeta } from '../../../build/schema.ts';

// SCAFFOLD — adjust subject + requiredKeys once the design's body is implemented.
export const meta: EmailMeta = {
  category: 'marketing',
  subject: 'You are invited to source equipment on COMACPRO', // TODO(design): final subject

  // Keys currently rendered by the scaffold (greeting + shared signature/footer). Update as the
  // body grows — the build fails if a rendered {{key}} is not declared here.
  requiredKeys: [
    'buyer_name',
    'sender_name',
    'sender_title',
    'sender_phone',
    'sender_whatsapp',
    'sender_email',
    'sender_avatar',
    'unsubscribe',
  ],
};
