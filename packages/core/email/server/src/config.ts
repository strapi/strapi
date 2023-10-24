import type { StrapiConfig } from './types';

export const config: StrapiConfig = {
  default: {
    provider: 'sendmail',
    providerOptions: {},
    settings: {
      defaultFrom: 'Strapi <no-reply@strapi.io>',
    },
  },
  validator() {},
};
