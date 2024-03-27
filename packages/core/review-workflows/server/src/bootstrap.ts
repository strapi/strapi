import executeCEBootstrap from '../../../server/src/bootstrap';
import { getAdminService, getService } from '../../server/src/utils';
import actions from './config/admin-actions';
import { persistTablesWithPrefix } from './utils/persisted-tables';

export default async (args: any) => {
  // TODO: Get admin service and get RW service
  const { actionProvider } = getAdminService('permission');

  if (strapi.ee.features.isEnabled('review-workflows')) {
    await persistTablesWithPrefix('strapi_workflows');
    const { bootstrap: rwBootstrap } = getService('review-workflows');
    await rwBootstrap();
    await actionProvider.registerMany(actions.reviewWorkflows);
    // Decorate the entity service with review workflow logic
    const { decorator } = getService('review-workflows-decorator');

    // TODO: use document service middleware
    // strapi.entityService.decorate(decorator);

    await getService('review-workflows-weekly-metrics').registerCron();
  }
};
