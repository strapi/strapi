'use strict';

const { getService } = require('./utils');
const { ALLOWED_WEBHOOK_EVENTS } = require('./constants');

module.exports = async () => {
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    strapi.webhookStore.addAllowedEvent(key, value);
  });

  getService('field-sizes').setCustomFieldInputSizes();
  await getService('components').syncConfigurations();
  await getService('content-types').syncConfigurations();
  await getService('permission').registerPermissions();
};
