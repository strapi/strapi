import executeCEBootstrap from '../../../server/src/bootstrap';
import { getService } from './utils';
import actions from './config/admin-actions';

export default async (args: any) => {
  const { actionProvider } = getService('permission');

  if (strapi.ee.features.isEnabled('sso')) {
    await actionProvider.registerMany(actions.sso);
  }

  // License only, not `admin.auditLogs.enabled`: unregistered actions get their stored grants
  // (roles and admin tokens) deleted by the boot permission cleanup
  if (strapi.ee.features.isEnabled('audit-logs')) {
    await actionProvider.registerMany(actions.auditLogs);
  }

  await getService('seat-enforcement').seatEnforcementWorkflow();
  await executeCEBootstrap(args);
};
