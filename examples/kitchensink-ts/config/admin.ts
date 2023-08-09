import type { Config } from '@strapi/strapi';

const adminConfig: Config.Admin = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'example-token'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'example-salt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'example-salt'),
    },
  },
});

export default adminConfig;
