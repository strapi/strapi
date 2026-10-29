import { getService } from './utils';
import { ALLOWED_WEBHOOK_EVENTS } from './constants';
import history from './history';
import preview from './preview';
import { registerContentManagerMcpTools } from './mcp/register-content-manager-mcp-tools';
import { registerAuditEvents } from './audit-logs';

export default async () => {
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    strapi.get('webhookStore').addAllowedEvent(key, value);
  });

  getService('field-sizes').setCustomFieldInputSizes();
  await getService('components').syncConfigurations();
  await getService('content-types').syncConfigurations();
  await getService('permission').registerPermissions();

  await registerContentManagerMcpTools({ strapi });

  if (strapi.has('audit-logs-lifecycle')) {
    registerAuditEvents(strapi.get('audit-logs-lifecycle'));
  }

  await history.bootstrap?.({ strapi });
  await preview.bootstrap?.({ strapi });
};
