import type { Core } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import contentApiTokenAuthStrategy from './strategies/content-api-token';
import adminTokenAuthStrategy from './strategies/admin-token';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const passportMiddleware = strapi.service('admin::passport').init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.get('auth').register('admin', adminAuthStrategy);
  strapi.get('auth').register('admin', adminTokenAuthStrategy);
  strapi.get('auth').register('content-api', contentApiTokenAuthStrategy);

  const shouldServeAdminPanel = strapi.config.get('admin.serveAdminPanel');

  if (shouldServeAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
