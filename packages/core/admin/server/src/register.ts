import type { Core } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import apiTokenAuthStrategy from './strategies/api-token';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const passportMiddleware = strapi.service('admin::passport').init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.get('auth').register('admin', adminAuthStrategy);
  strapi.get('auth').register('content-api', apiTokenAuthStrategy);

  if (strapi.config.get('admin.serveAdminPanel')) {
    registerAdminPanelRoute({ strapi });
  }
};
