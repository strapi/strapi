import { getService } from './utils';
import { ALLOWED_WEBHOOK_EVENTS } from './constants';
import history from './history';

export default async () => {
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    strapi.get('webhookStore').addAllowedEvent(key, value);
  });

  getService('field-sizes').setCustomFieldInputSizes();
  await getService('components').syncConfigurations();
  await getService('content-types').syncConfigurations();
  await getService('permission').registerPermissions();

  await history.bootstrap?.({ strapi });
};
