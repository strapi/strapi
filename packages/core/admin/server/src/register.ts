import { Strapi } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import apiTokenAuthStrategy from './strategies/api-token';

export default ({ strapi }: { strapi: Strapi }) => {
  const passportMiddleware = strapi.admin?.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.container.get('auth').register('admin', adminAuthStrategy);
  strapi.container.get('auth').register('content-api', apiTokenAuthStrategy);

  if (strapi.config.serveAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
