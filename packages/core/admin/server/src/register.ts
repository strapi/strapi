import type { Core } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import { createAiAdminService } from './ai/services/ai';
import contentApiTokenAuthStrategy from './strategies/content-api-token';
import adminTokenAuthStrategy from './strategies/admin-token';
import { migrateAdminPreferedLanguageDkToDa } from './migrations/database/migrate-prefered-language-dk-to-da';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.db.migrations.providers.internal.register(migrateAdminPreferedLanguageDkToDa);

  const passportMiddleware = strapi.service('admin::passport').init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.get('auth').register('admin', adminAuthStrategy);
  strapi.get('auth').register('admin', adminTokenAuthStrategy);
  strapi.get('auth').register('content-api', contentApiTokenAuthStrategy);

  strapi.add('ai.admin', () => createAiAdminService({ strapi }));

  const shouldServeAdminPanel = strapi.config.get('admin.serveAdminPanel');

  if (shouldServeAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
