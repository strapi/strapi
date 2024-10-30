import executeCEBootstrap from '../../../server/src/bootstrap';
import { getService } from './utils';
import actions from './config/admin-actions';

export default async (args: any) => {
  const { actionProvider } = getService('permission');
  const { persistTablesWithPrefix } = getService('persist-tables');

  if (strapi.ee.features.isEnabled('sso')) {
    await actionProvider.registerMany(actions.sso);
  }

  if (strapi.ee.features.isEnabled('audit-logs')) {
    await persistTablesWithPrefix('strapi_audit_logs');
    await actionProvider.registerMany(actions.auditLogs);
  }

  await getService('seat-enforcement').seatEnforcementWorkflow();
  await executeCEBootstrap(args);
};
