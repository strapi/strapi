import type {
  AILocalizationJobsController,
  ContentTypesController,
  IsoLocalesController,
  LocalesController,
  SettingsController,
} from './controllers';
import type { LocaleService } from './services';

export type * as Controllers from './controllers';
export type * as Services from './services';

/** Default contracts loaded with the plugin's server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::i18n.locales': LocaleService;
      }

      interface PackageControllers {
        'plugin::i18n.locales': LocalesController;
        'plugin::i18n.iso-locales': IsoLocalesController;
        'plugin::i18n.content-types': ContentTypesController;
        'plugin::i18n.settings': SettingsController;
        'plugin::i18n.ai-localization-jobs': AILocalizationJobsController;
      }
    }
  }
}
