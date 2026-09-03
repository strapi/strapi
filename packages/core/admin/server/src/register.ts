import type { Core } from '@strapi/types';
import registerAdminPanelRoute from './routes/serve-admin-panel';
import adminAuthStrategy from './strategies/admin';
import { createAiAdminService } from './ai/services/ai';
import { createStrapiManagedAiProvider } from './ai/services/strapi-managed';
import contentApiTokenAuthStrategy from './strategies/content-api-token';
import adminTokenAuthStrategy from './strategies/admin-token';
import { migrateAdminPreferedLanguageDkToDa } from './migrations/database/migrate-prefered-language-dk-to-da';

// TODO remove
const createByokAiProvider = ({ strapi }: { strapi: Core.Strapi }) => {};

// TODO move out
const createAiProvidersRegistry = ({ strapi }: { strapi: Core.Strapi }) => {
  // TODO type
  const providers = new Map<string, unknown>();
  // TODO make sure this decision is right;
  //      to me, the default is the first one, let's see later once we have multiple providers.
  // TODO type
  let defaultProvider: unknown | null = null;

  return {
    // TODO type
    register(provider: any) {
      // TODO scaffolding code:
      //      - if already exists

      console.log('Registering AI provider', provider.name);

      providers.set(provider.name, provider);

      if (defaultProvider === null) {
        defaultProvider = provider;
      }
    },
    activate() {},
    getDefault() {
      // TODO review error
      if (defaultProvider === null) {
        throw new Error('No AI provider registered');
      }

      return defaultProvider;
    },
  };
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.db.migrations.providers.internal.register(migrateAdminPreferedLanguageDkToDa);

  const passportMiddleware = strapi.service('admin::passport').init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.get('auth').register('admin', adminAuthStrategy);
  strapi.get('auth').register('admin', adminTokenAuthStrategy);
  strapi.get('auth').register('content-api', contentApiTokenAuthStrategy);

  strapi.add('ai.admin', () => createAiAdminService({ strapi }));
  strapi.add('ai.providers', () => createAiProvidersRegistry({ strapi }));
  strapi.add('ai.service', () => {
    console.log('before', strapi.ai.providers.getDefault());
    // TODO rethink this condition. we want to register this only on Growth.
    if (strapi.ai.providers.getDefault() === null) {
      strapi.ai.providers.register(createStrapiManagedAiProvider({ strapi }));
    }
    console.log('after', strapi.ai.providers.getDefault());

    return strapi.ai.providers.getDefault();

    // return createByokAiProvider({ strapi });

    strapi.log.info('Registering Strapi Managed AI Provider');
    // @ts-ignore
    console.log(strapi.ai?.providers);

    return createStrapiManagedAiProvider({ strapi });
  });
  // strapi.ai.service.generateLocalizations(…);

  // createAiAdminService()
  //   getTransalation;
  //   getConfig;
  //   Blabla;
  // createAiManagedAdminService() return AdminServiceInterface
  //   getToken();
  // createAiBYOKAdminService()
  //   (aiAdminService as AdminServiceInterface).getTranslation;

  const shouldServeAdminPanel = strapi.config.get('admin.serveAdminPanel');

  if (shouldServeAdminPanel) {
    registerAdminPanelRoute({ strapi });
  }
};
