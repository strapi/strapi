import type {
  AILocalizationJobsController,
  ContentTypesController,
  IsoLocalesController,
  LocalesController,
  SettingsController,
} from './controllers';
import type { AiTranslationsService } from '../services/ai-translations';
import type * as ServiceContracts from './services';

export type * as Controllers from './controllers';
export type * as Services from './services';

/** Default contracts loaded with the plugin's server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * The i18n rows of the core store. `default_locale` is the code of the default locale, written
       * when the first locale is created. `settings` holds the plugin settings.
       */
      interface Stores {
        plugin_i18n_default_locale: string;
        plugin_i18n_settings: { aiLocalizations?: boolean | undefined };
      }

      interface PackageServices {
        'plugin::i18n.locales': ServiceContracts.LocaleService;
        'plugin::i18n.permissions': ServiceContracts.PermissionsService;
        'plugin::i18n.metrics': ServiceContracts.MetricsService;
        'plugin::i18n.localizations': ServiceContracts.LocalizationsService;
        'plugin::i18n.settings': ServiceContracts.SettingsService;
        'plugin::i18n.iso-locales': ServiceContracts.ISOLocalesService;
        'plugin::i18n.content-types': ServiceContracts.ContentTypesService;
        'plugin::i18n.sanitize': ServiceContracts.SanitizeService;
        'plugin::i18n.ai-localizations': ServiceContracts.AILocalizationsService;
        'plugin::i18n.ai-localization-jobs': ServiceContracts.AILocalizationJobsService;
        'plugin::i18n.ai-translations': AiTranslationsService;
        'plugin::i18n.fill-from-locale': ServiceContracts.FillFromLocaleService;
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
