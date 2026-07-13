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

  // Auth-sensitive models: their reads must always hit the writer so a revoked
  // credential/permission isn't evaluated from a lagging read replica (incl.
  // on `auth: false` routes like login/refresh that bypass the auth phase).
  strapi.db.routing.registerWriterModels([
    'admin::user',
    'admin::role',
    'admin::permission',
    'admin::api-token',
    'admin::api-token-permission',
    'admin::transfer-token',
    'admin::transfer-token-permission',
    'admin::session',
  ]);

  strapi.add('ai.admin', () => createAiAdminService({ strapi }));

  const shouldServeAdminPanel = strapi.config.get('admin.serveAdminPanel');

  if (shouldServeAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
