import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env.required('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env.required('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env.required('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env.required('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
});

export default config;
