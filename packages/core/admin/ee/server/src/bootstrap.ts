import executeCEBootstrap from '../../../server/src/bootstrap';
import { getService } from './utils';
import actions from './config/admin-actions';
import { isAuditLogsEnabled } from './audit-logs/utils';

export default async (args: any) => {
  const { actionProvider } = getService('permission');

  if (strapi.ee.features.isEnabled('sso')) {
    await actionProvider.registerMany(actions.sso);
  }

  // Same condition as the audit-logs routes, so the role editor lists no permission without a route
  if (isAuditLogsEnabled(strapi)) {
    await actionProvider.registerMany(actions.auditLogs);
  }

  await getService('seat-enforcement').seatEnforcementWorkflow();
  await executeCEBootstrap(args);
};
