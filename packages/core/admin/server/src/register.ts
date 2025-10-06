import type { Core } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import apiTokenAuthStrategy from './strategies/api-token';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const passportMiddleware = strapi.service('admin::passport').init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.get('auth').register('admin', adminAuthStrategy);
  strapi.get('auth').register('content-api', apiTokenAuthStrategy);

  // Prevent serving static admin panel in development mode when autoReload is enabled
  // This fixes race conditions during server restarts that can cause MIME type conflicts
  const shouldServeAdminPanel = strapi.config.get('admin.serveAdminPanel');
  const isAutoReloadEnabled = strapi.config.get('autoReload');
  const isDevelopment = strapi.config.get('environment') === 'development';

  if (shouldServeAdminPanel && !(isDevelopment && isAutoReloadEnabled)) {
    registerAdminPanelRoute({ strapi });
  }
};
