'use strict';

const { features } = require('@strapi/strapi/dist/utils/ee').default;
const executeCEDestroy = require('../../server/destroy');

module.exports = async ({ strapi }) => {
  if (features.isEnabled('audit-logs')) {
    strapi.container.get('audit-logs').destroy();
  }

  await executeCEDestroy();
};
