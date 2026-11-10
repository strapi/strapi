import type { Core } from '@strapi/strapi';

declare global {
  namespace Strapi {
    namespace Registries {
      interface AppServices {
        'plugin::sentry.sentry': { custom(): 'application' };
      }

      interface AppConfigs {
        'plugin::sentry': {
          dsn: string;
          sendMetadata: boolean;
          init: { application: true };
        };
      }

      interface AppControllers {
        'plugin::i18n.settings': { custom: Core.ControllerHandler<'application'> };
      }

      interface AppPolicies {
        'admin::hasPermissions': { application: true };
        'global::isOwner': undefined;
      }
    }
  }
}
