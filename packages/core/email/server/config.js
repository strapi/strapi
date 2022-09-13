'use strict';

module.exports = {
  default: {
    provider: 'sendmail',
    providerOptions: {},
    settings: {
      defaultFrom: 'Strapi <no-reply@strapi.io>',
    },
  },
  validator() {},
};
