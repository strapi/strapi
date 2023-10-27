import executeCEBootstrap from '../../../server/src/bootstrap';
import '@strapi/types';
import { getService } from '../../server/src/utils';
import actions from './config/admin-actions';
import { persistTablesWithPrefix } from './utils/persisted-tables';

export default async (args: any) => {
  const { actionProvider } = getService('permission');
  if (strapi.EE.features.isEnabled('sso')) {
    await actionProvider.registerMany(actions.sso);
  }
  if (strapi.EE.features.isEnabled('audit-logs')) {
    await persistTablesWithPrefix('strapi_audit_logs');
    await actionProvider.registerMany(actions.auditLogs);
  }
  if (strapi.EE.features.isEnabled('review-workflows')) {
    await persistTablesWithPrefix('strapi_workflows');
    const { bootstrap: rwBootstrap } = getService('review-workflows');
    await rwBootstrap();
    await actionProvider.registerMany(actions.reviewWorkflows);
    // Decorate the entity service with review workflow logic
    const { decorator } = getService('review-workflows-decorator');
    // @ts-expect-error - add decorator to entity service
    strapi.entityService.decorate(decorator);
    await getService('review-workflows-weekly-metrics').registerCron();
  }
  await getService('seat-enforcement').seatEnforcementWorkflow();
  await executeCEBootstrap(args);
};
