import type { Core } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import apiTokenAuthStrategy from './strategies/api-token';
import serviceAccountAuthStrategy from './strategies/service-account';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const passportMiddleware = strapi.service('admin::passport').init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.get('auth').register('admin', adminAuthStrategy);
  strapi.get('auth').register('admin', serviceAccountAuthStrategy);
  strapi.get('auth').register('content-api', apiTokenAuthStrategy);
  strapi.get('auth').register('content-api', serviceAccountAuthStrategy);

  const shouldServeAdminPanel = strapi.config.get('admin.serveAdminPanel');

  if (shouldServeAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
