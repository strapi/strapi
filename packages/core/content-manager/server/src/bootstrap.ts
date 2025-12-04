import { getService } from '@content-manager/server/utils';
import { ALLOWED_WEBHOOK_EVENTS } from '@content-manager/server/constants';
import history from '@content-manager/server/history';
import preview from '@content-manager/server/preview';

export default async () => {
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    strapi.get('webhookStore').addAllowedEvent(key, value);
  });

  getService('field-sizes').setCustomFieldInputSizes();
  await getService('components').syncConfigurations();
  await getService('content-types').syncConfigurations();
  await getService('permission').registerPermissions();

  await history.bootstrap?.({ strapi });
  await preview.bootstrap?.({ strapi });
};
