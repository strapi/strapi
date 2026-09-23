import type {
  AILocalizationJobsController,
  ContentTypesController,
  IsoLocalesController,
  LocalesController,
  SettingsController,
} from './types/controllers';
import type { LocaleService } from './types/services';

/** Import this module from an application declaration file to opt in to stricter i18n types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultServices {
        'plugin::i18n.locales': LocaleService;
      }

      interface DefaultControllers {
        'plugin::i18n.locales': LocalesController;
        'plugin::i18n.iso-locales': IsoLocalesController;
        'plugin::i18n.content-types': ContentTypesController;
        'plugin::i18n.settings': SettingsController;
        'plugin::i18n.ai-localization-jobs': AILocalizationJobsController;
      }
    }
  }
}
