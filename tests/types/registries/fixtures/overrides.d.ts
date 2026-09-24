import type { Core } from '@strapi/strapi';

declare global {
  namespace Strapi {
    namespace Registries {
      interface Services {
        'plugin::sentry.sentry': { custom(): 'application' };
      }

      interface Configs {
        'plugin::sentry': {
          dsn: string;
          sendMetadata: boolean;
          init: { application: true };
        };
      }

      interface Controllers {
        'plugin::i18n.settings': { custom: Core.ControllerHandler<'application'> };
      }

      interface Policies {
        'admin::hasPermissions': { application: true };
        'global::isOwner': undefined;
      }
    }
  }
}
